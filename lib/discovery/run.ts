import { prisma } from "@/lib/db";
import type { Prisma, ProductCandidate } from "@/lib/generated/prisma/client";
import type { DiscoverySource } from "@/lib/generated/prisma/enums";
import { getConnector } from "@/lib/connectors";
import type { Connector, DiscoveryQueryInput, RawCandidate } from "@/lib/connectors/types";
import { attachFetchedOffer, createDraftProduct } from "@/lib/admin/import-offer";
import { classifyBrand, type BrandEntry } from "./brand";
import { discoveryConfig, type DiscoveryConfig } from "./config";
import { saoPauloDayStart, saoPauloHour } from "./day";
import { fingerprintOf } from "./dedup";
import { DEFAULT_BLOCKED_TERMS, evaluateGates } from "./gates";
import { compareAcrossStores, decideMatch, type CrossMatch } from "./match";
import { metricsData } from "./metrics";
import { scoreCandidate } from "./score";
import { selectForImport } from "./selection";
import { ensureShopeeTaxonomy } from "./taxonomy";

/**
 * Orquestração da descoberta (A.8). Não conhece loja nenhuma: tudo vem do contrato `searchCandidates`
 * do conector. Etapas idempotentes — rodar duas vezes no mesmo dia não duplica produto, porque o
 * candidato é único por (fonte, anúncio), a oferta é conferida antes de criar e o limite diário
 * desconta o que já foi importado hoje.
 */

/** Fonte da descoberta -> chave do conector. O feed CSV não passa por aqui (scripts/import-feed.ts). */
export const SOURCE_CONNECTOR: Record<DiscoverySource, string | null> = {
  SHOPEE_API: "shopee",
  SHOPEE_FEED: null,
  ALIEXPRESS_API: "aliexpress",
};

const PAGE_LIMIT = 40;
const STALE_RUN_MS = 60 * 60 * 1000;
const UNAVAILABLE_RETRY_DAYS = 7;
const CANDIDATE_MAX_AGE_DAYS = 3;
const MATCH_POOL_DAYS = 30;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const day = (days: number) => days * 86_400_000;

export type Logger = (message: string, data?: Record<string, unknown>) => void;
const silent: Logger = () => {};

export interface RunOptions {
  /** Ignora DISCOVERY_ENABLED (botão "rodar agora" e script manual). */
  force?: boolean;
  /** Só estas pautas; padrão: todas as ativas. */
  queryIds?: string[];
  trigger?: "daily" | "manual";
  now?: Date;
  log?: Logger;
}

export interface RunSummary {
  disabled: boolean;
  runs: number;
  found: number;
  kept: number;
  imported: number;
  rejected: number;
  failedRuns: number;
  /** Importados que ficaram sem correspondência automática e esperam confirmação. */
  matchesToReview: number;
}

const EMPTY: RunSummary = { disabled: false, runs: 0, found: 0, kept: 0, imported: 0, rejected: 0, failedRuns: 0, matchesToReview: 0 };

interface Context {
  config: DiscoveryConfig;
  brands: BrandEntry[];
  blockedTerms: string[];
  log: Logger;
  now: Date;
}

async function loadContext(options: RunOptions): Promise<Context> {
  const [brands, blocked] = await Promise.all([
    prisma.brand.findMany({ where: { active: true } }),
    prisma.blockedTerm.findMany(),
  ]);
  return {
    config: discoveryConfig(),
    brands: brands.map((brand) => ({ id: brand.id, name: brand.name, aliases: brand.aliases, weight: brand.weight })),
    blockedTerms: blocked.length > 0 ? blocked.map((item) => item.term) : DEFAULT_BLOCKED_TERMS,
    log: options.log ?? silent,
    now: options.now ?? new Date(),
  };
}

/** Conector da fonte, só se estiver configurado e tiver loja ativa cadastrada. */
async function usableSource(source: DiscoverySource) {
  const key = SOURCE_CONNECTOR[source];
  const connector = getConnector(key);
  if (!connector?.searchCandidates || !connector.isConfigured()) return null;
  const store = await prisma.store.findFirst({ where: { connector: connector.key, active: true } });
  return store ? { connector, store } : null;
}

const originalUrlOf = (source: DiscoverySource, candidate: Pick<ProductCandidate, "externalListingId" | "externalSellerId">) =>
  source === "ALIEXPRESS_API"
    ? `https://pt.aliexpress.com/item/${candidate.externalListingId}.html`
    : `https://shopee.com.br/product/${candidate.externalSellerId}/${candidate.externalListingId}`;

// ---------------------------------------------------------------------------
// 1. Buscar, filtrar, pontuar e gravar
// ---------------------------------------------------------------------------

async function collectQuery(
  query: Prisma.DiscoveryQueryGetPayload<object>,
  runId: string,
  ctx: Context,
): Promise<{ found: number; kept: number; rejected: number; rejections: Record<string, number> }> {
  const source = await usableSource(query.source);
  if (!source) throw new Error("Conector não configurado ou sem loja ativa cadastrada em /admin/lojas.");
  const { connector, store } = source;

  const counts = { found: 0, kept: 0, rejected: 0 };
  const rejections: Record<string, number> = {};

  for (let page = 1; page <= query.pages; page++) {
    const input: DiscoveryQueryInput = {
      kind: query.kind as DiscoveryQueryInput["kind"],
      value: query.value ?? undefined,
      sort: query.sort as DiscoveryQueryInput["sort"],
      page,
      limit: PAGE_LIMIT,
    };
    const result = await connector.searchCandidates!(input);
    await processPage(result.candidates, { query, runId, source: query.source, connector, storeId: store.id }, ctx, counts, rejections);
    if (!result.hasNextPage) break;
    await sleep(connector.limits.minIntervalMs);
  }
  return { ...counts, rejections };
}

async function processPage(
  raws: RawCandidate[],
  where: { query: { id: string }; runId: string; source: DiscoverySource; connector: Connector; storeId: string },
  ctx: Context,
  counts: { found: number; kept: number; rejected: number },
  rejections: Record<string, number>,
) {
  if (raws.length === 0) return;
  const ids = raws.map((raw) => raw.externalListingId);
  const [existing, offers] = await Promise.all([
    prisma.productCandidate.findMany({ where: { source: where.source, externalListingId: { in: ids } } }),
    prisma.offer.findMany({
      where: { storeId: where.storeId, externalListingId: { in: ids } },
      select: { id: true, externalListingId: true, variant: { select: { productId: true } } },
    }),
  ]);
  const known = new Map(existing.map((candidate) => [candidate.externalListingId, candidate]));
  const offerByListing = new Map(offers.map((offer) => [offer.externalListingId!, offer]));

  for (const raw of raws) {
    counts.found++;

    // Métricas de oferta já cadastrada se atualizam em toda busca (A.10), mesmo que o candidato
    // seja descartado. A API do AliExpress dá % de positivas, não estrelas: só vendas entram.
    const offer = offerByListing.get(raw.externalListingId);
    if (offer) {
      const data = metricsData(
        {
          salesCount: raw.salesCount,
          ratingCentis: where.source === "ALIEXPRESS_API" ? null : raw.ratingCentis,
          ratingCount: where.source === "ALIEXPRESS_API" ? null : raw.ratingCount,
        },
        ctx.now,
      );
      if (Object.keys(data).length > 0) await prisma.offer.update({ where: { id: offer.id }, data });
    }

    const brandResult = classifyBrand(raw.title, ctx.brands, raw.officialStore);
    const reason = evaluateGates(raw, { blockedTerms: ctx.blockedTerms, brandCount: brandResult.brandCount });
    if (reason) {
      counts.rejected++;
      rejections[reason] = (rejections[reason] ?? 0) + 1;
      continue;
    }

    const score = scoreCandidate({
      salesCount: raw.salesCount,
      ratingCentis: raw.ratingCentis,
      ratingCount: raw.ratingCount,
      brandWeight: brandResult.brand?.weight ?? 0,
      officialStore: raw.officialStore,
      discountPct: raw.discountPct,
      commissionPct: raw.commissionPct,
      priceCents: raw.priceCents,
      hasImage: Boolean(raw.imageUrl),
    });

    const fields = {
      externalSellerId: raw.externalSellerId,
      sellerName: raw.sellerName,
      officialStore: raw.officialStore,
      title: raw.title,
      imageUrl: raw.imageUrl,
      priceCents: raw.priceCents,
      previousPriceCents: raw.previousPriceCents,
      salesCount: raw.salesCount,
      ratingCentis: raw.ratingCentis,
      ratingCount: raw.ratingCount,
      commissionPct: raw.commissionPct,
      discountPct: raw.discountPct === null ? null : Math.round(raw.discountPct),
      categoryPath: raw.categoryPath,
      brandId: brandResult.brand?.id ?? null,
      tier: brandResult.tier,
      score: score.value,
      reasons: score.reasons,
      fingerprint: fingerprintOf(raw.title),
      runId: where.runId,
      queryId: where.query.id,
      lastSeenAt: ctx.now,
    };

    const previous = known.get(raw.externalListingId);
    // Rejeição é decisão: nunca ressuscita. "Sem link" ganha nova chance depois de uma semana.
    const retry =
      previous?.status === "UNAVAILABLE" && ctx.now.getTime() - previous.lastSeenAt.getTime() > day(UNAVAILABLE_RETRY_DAYS);
    const status = offer ? ("DUPLICATE" as const) : ("NEW" as const);

    await prisma.productCandidate.upsert({
      where: { source_externalListingId: { source: where.source, externalListingId: raw.externalListingId } },
      create: {
        source: where.source,
        externalListingId: raw.externalListingId,
        ...fields,
        status,
        statusReason: offer ? "já cadastrado como oferta" : null,
        productId: offer?.variant.productId ?? null,
      },
      update: { ...fields, ...(retry ? { status: "NEW" as const, statusReason: null } : {}) },
    });
    if (!offer && (!previous || previous.status === "NEW" || previous.status === "SELECTED" || retry)) counts.kept++;
  }
}

// ---------------------------------------------------------------------------
// 2. Selecionar e importar
// ---------------------------------------------------------------------------

type Candidate = ProductCandidate;

async function brandName(brandId: string | null): Promise<string | null> {
  if (!brandId) return null;
  return (await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } }))?.name ?? null;
}

async function setStatus(candidate: Candidate, status: Candidate["status"], statusReason: string | null, productId?: string) {
  await prisma.productCandidate.update({
    where: { id: candidate.id },
    data: { status, statusReason, ...(productId ? { productId } : {}) },
  });
}

export type ImportOutcome = "imported" | "unavailable" | "duplicate" | "failed";

/**
 * Importa UM candidato: busca de novo na API preço, link de afiliado e fotos (o payload da
 * descoberta nunca é fonte de preço). Sem link de afiliado real, não importa.
 */
export async function importCandidate(
  candidate: Candidate,
  options: { nicheIds: string[]; categoryId: string | null; productId?: string; variantId?: string },
): Promise<{ outcome: ImportOutcome; productId?: string }> {
  const source = await usableSource(candidate.source);
  if (!source) return { outcome: "failed" };
  const { connector, store } = source;

  const exists = await prisma.offer.findFirst({
    where: { storeId: store.id, externalListingId: candidate.externalListingId },
    select: { variant: { select: { productId: true } } },
  });
  if (exists) {
    await setStatus(candidate, "DUPLICATE", "já cadastrado como oferta", exists.variant.productId);
    return { outcome: "duplicate", productId: exists.variant.productId };
  }

  let result;
  try {
    result = await connector.fetchOffer({
      externalListingId: candidate.externalListingId,
      externalSellerId: candidate.externalSellerId,
      originalUrl: null,
    });
  } catch {
    return { outcome: "failed" };
  }
  if (result.kind !== "ok" || !result.title) {
    await setStatus(candidate, "UNAVAILABLE", "a loja não devolveu o anúncio");
    return { outcome: "unavailable" };
  }
  if (!result.affiliateUrl) {
    await setStatus(candidate, "UNAVAILABLE", "sem link de afiliado");
    return { outcome: "unavailable" };
  }

  let productId = options.productId;
  let variantId = options.variantId;
  if (!productId || !variantId) {
    const product = await createDraftProduct({ name: result.title, nicheIds: options.nicheIds, categoryId: options.categoryId });
    productId = product.id;
    variantId = product.variants[0].id;
    await prisma.product.update({
      where: { id: productId },
      data: { brand: await brandName(candidate.brandId), tier: candidate.tier },
    });
    // Sem a linha de conteúdo o produto nunca entra na geração editorial (e não fica publicável).
    await prisma.productContent.upsert({ where: { productId }, create: { productId, status: "PENDING" }, update: {} });
  }

  await attachFetchedOffer({
    productId,
    variantId,
    store,
    listingId: candidate.externalListingId,
    sellerId: candidate.externalSellerId,
    originalUrl: originalUrlOf(candidate.source, candidate),
    result: {
      ...result,
      // A busca do AliExpress dá volume e a página de detalhe, não: o que a busca trouxe vale.
      salesCount: result.salesCount ?? candidate.salesCount,
      ratingCentis: result.ratingCentis ?? (candidate.source === "ALIEXPRESS_API" ? null : candidate.ratingCentis),
    },
  });
  await setStatus(candidate, "IMPORTED", null, productId);
  return { outcome: "imported", productId };
}

/** Importa o candidato do outro lado como segunda oferta do MESMO produto (confirmado ou automático). */
export async function attachCandidateToProduct(candidateId: string, productId: string): Promise<boolean> {
  const candidate = await prisma.productCandidate.findUnique({ where: { id: candidateId } });
  const variant = await prisma.productVariant.findFirst({
    where: { productId },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });
  if (!candidate || !variant) return false;
  const { outcome } = await importCandidate(candidate, { nicheIds: [], categoryId: null, productId, variantId: variant.id });
  return outcome === "imported" || outcome === "duplicate";
}

// ---------------------------------------------------------------------------
// 3. Correspondência entre lojas (Shopee <-> AliExpress)
// ---------------------------------------------------------------------------

const rootCategory = (path: string[]) => path[0]?.toLowerCase() ?? null;

/** Prefixo de `MatchSuggestion.catalogId` para sugestões vindas da descoberta. */
export const CANDIDATE_REF_PREFIX = "candidate:";

/**
 * Procura, entre os candidatos já vistos na outra loja, o mesmo produto. Vincula sozinho só com
 * marca + modelo (isAutoMatch); o resto — todo genérico — vira sugestão e exige confirmação humana.
 */
export async function matchAcrossSources(candidate: Candidate, productId: string): Promise<"auto" | "review" | "none"> {
  const others = (["SHOPEE_API", "ALIEXPRESS_API"] as const).filter((source) => source !== candidate.source);
  const pool = await prisma.productCandidate.findMany({
    where: {
      source: { in: [...others] },
      status: "NEW",
      lastSeenAt: { gte: new Date(Date.now() - day(MATCH_POOL_DAYS)) },
    },
    orderBy: { score: "desc" },
    take: 400,
  });
  if (pool.length === 0) return "none";

  const subject = {
    name: candidate.title,
    priceCents: candidate.priceCents,
    brand: await brandName(candidate.brandId),
    tier: candidate.tier,
    category: rootCategory(candidate.categoryPath),
  };
  const brandNames = new Map<string, string | null>();
  const scored: { other: Candidate; match: CrossMatch }[] = [];
  for (const other of pool) {
    if (other.fingerprint === candidate.fingerprint && other.source === candidate.source) continue;
    if (other.brandId && !brandNames.has(other.brandId)) brandNames.set(other.brandId, await brandName(other.brandId));
    const match = compareAcrossStores(subject, {
      name: other.title,
      priceCents: other.priceCents,
      brand: other.brandId ? (brandNames.get(other.brandId) ?? null) : null,
      tier: other.tier,
      category: rootCategory(other.categoryPath),
    });
    if (match.suggestable) scored.push({ other, match });
  }
  scored.sort((a, b) => b.match.similarity.score - a.match.similarity.score);

  const decision = decideMatch(scored[0]?.match, scored[1]?.match);
  if (decision === "none") return "none";

  if (decision === "auto") {
    const attached = await attachCandidateToProduct(scored[0].other.id, productId).catch(() => false);
    if (attached) return "auto";
  }

  for (const { other, match } of scored.slice(0, 3)) {
    const generic = subject.tier !== "BRANDED" || other.tier !== "BRANDED";
    await prisma.matchSuggestion.upsert({
      where: { productId_catalogId: { productId, catalogId: `${CANDIDATE_REF_PREFIX}${other.id}` } },
      update: { score: match.similarity.score, priceCents: other.priceCents, name: other.title },
      create: {
        productId,
        catalogId: `${CANDIDATE_REF_PREFIX}${other.id}`,
        name: other.title,
        imageUrl: other.imageUrl,
        priceCents: other.priceCents,
        score: match.similarity.score,
        reasons: [
          `${other.source === "ALIEXPRESS_API" ? "AliExpress" : "Shopee"}`,
          `${Math.round(match.overlap * 100)}% das palavras iguais`,
          ...(generic ? ["sem marca/modelo confirmados: confirmação obrigatória"] : []),
        ],
        status: "PENDING",
      },
    });
  }
  return "review";
}

// ---------------------------------------------------------------------------
// Rodada completa
// ---------------------------------------------------------------------------

async function importedToday(now: Date): Promise<number> {
  const total = await prisma.discoveryRun.aggregate({
    _sum: { imported: true },
    where: { createdAt: { gte: saoPauloDayStart(now) } },
  });
  return total._sum.imported ?? 0;
}

async function selectAndImport(ctx: Context, summary: RunSummary, queries: Map<string, { nicheId: string | null; categoryId: string | null }>) {
  const remaining = ctx.config.dailyLimit - (await importedToday(ctx.now));
  if (remaining <= 0) {
    ctx.log("limite diário atingido", { limite: ctx.config.dailyLimit });
    return;
  }

  const sources: DiscoverySource[] = [];
  for (const source of ["SHOPEE_API", "ALIEXPRESS_API"] as const) if (await usableSource(source)) sources.push(source);
  if (sources.length === 0) return;

  const pool = await prisma.productCandidate.findMany({
    where: {
      status: "NEW",
      source: { in: sources },
      score: { gte: ctx.config.minScore },
      lastSeenAt: { gte: new Date(ctx.now.getTime() - day(CANDIDATE_MAX_AGE_DAYS)) },
    },
    orderBy: { score: "desc" },
    take: 1000,
  });

  // Repetidos dentro da mesma fonte saem; o mesmo produto de marca nas duas lojas vira um produto
  // só, com duas ofertas. Genérico igual nas duas lojas NUNCA se funde sozinho: fica o melhor e o
  // outro espera a fila de confirmação.
  const primaries: { candidate: Candidate; twin: Candidate | null }[] = [];
  const byFingerprint = new Map<string, Candidate[]>();
  for (const candidate of pool) byFingerprint.set(candidate.fingerprint, [...(byFingerprint.get(candidate.fingerprint) ?? []), candidate]);
  for (const group of byFingerprint.values()) {
    const bySource = new Map<DiscoverySource, Candidate>();
    for (const candidate of group) {
      if (!bySource.has(candidate.source)) bySource.set(candidate.source, candidate);
      else await setStatus(candidate, "DUPLICATE", "título repetido na mesma fonte");
    }
    const [best, other] = [...bySource.values()].sort((a, b) => b.score - a.score);
    const merge = other && best.tier === "BRANDED" && other.tier === "BRANDED";
    primaries.push({ candidate: best, twin: merge ? other : null });
  }

  const quotaRows = await prisma.discoveryQuery.groupBy({ by: ["source"], where: { active: true }, _sum: { quota: true } });
  const perSource: Record<string, number> = {};
  for (const row of quotaRows) if ((row._sum.quota ?? 0) > 0) perSource[row.source] = row._sum.quota!;

  const selected = selectForImport(
    primaries.map((item) => ({
      ...item,
      score: item.candidate.score,
      tier: item.candidate.tier,
      source: item.candidate.source,
      group: queries.get(item.candidate.queryId ?? "")?.nicheId ?? item.candidate.queryId ?? "geral",
    })),
    {
      total: remaining,
      brandedMinPct: ctx.config.brandedMinPct,
      genericMaxPct: ctx.config.genericMaxPct,
      perGroup: Math.max(5, Math.ceil(remaining * 0.3)),
      perSource: Object.keys(perSource).length > 0 ? perSource : undefined,
    },
  );

  for (const { candidate, twin } of selected) {
    const where = queries.get(candidate.queryId ?? "");
    const { outcome, productId } = await importCandidate(candidate, {
      nicheIds: where?.nicheId ? [where.nicheId] : [],
      categoryId: where?.categoryId ?? null,
    });
    const connector = getConnector(SOURCE_CONNECTOR[candidate.source]);
    if (outcome === "imported" && productId) {
      summary.imported++;
      if (candidate.runId) await prisma.discoveryRun.update({ where: { id: candidate.runId }, data: { imported: { increment: 1 } } });
      try {
        if (twin) await attachCandidateToProduct(twin.id, productId);
        else if ((await matchAcrossSources(candidate, productId)) === "review") summary.matchesToReview++;
      } catch (error) {
        // Falha na correspondência não desfaz a importação.
        ctx.log("correspondência falhou", { produto: productId, erro: error instanceof Error ? error.message : String(error) });
      }
    }
    await sleep(connector?.limits.minIntervalMs ?? 400);
  }
  ctx.log("importação concluída", { importados: summary.imported, disponiveis: remaining });
}

export async function runDiscovery(options: RunOptions = {}): Promise<RunSummary> {
  const summary: RunSummary = { ...EMPTY };
  if (!options.force && !discoveryConfig().enabled) return { ...summary, disabled: true };

  const ctx = await loadContext(options);
  const trigger = options.trigger ?? "manual";

  // Rodada que o worker deixou pela metade volta como falha (a próxima cria outra, sem duplicar).
  await prisma.discoveryRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(ctx.now.getTime() - STALE_RUN_MS) } },
    data: { status: "FAILED", error: "interrompida (worker reiniciado)", finishedAt: ctx.now },
  });

  const queries = await prisma.discoveryQuery.findMany({
    where: { active: true, ...(options.queryIds ? { id: { in: options.queryIds } } : {}) },
    orderBy: [{ source: "asc" }, { position: "asc" }],
  });
  // Categorias da Shopee viram nicho + categoria no banco; pauta de categoria sem destino herda o dela.
  const taxonomy = await ensureShopeeTaxonomy();
  const queryInfo = new Map(
    queries.map((query) => {
      const own = query.source === "SHOPEE_API" && query.kind === "category" && query.value ? taxonomy.get(query.value) : undefined;
      return [query.id, { nicheId: query.nicheId ?? own?.nicheId ?? null, categoryId: query.categoryId ?? own?.categoryId ?? null }];
    }),
  );

  for (const query of queries) {
    const run = await prisma.discoveryRun.create({
      data: {
        queryId: query.id,
        source: query.source,
        status: "RUNNING",
        startedAt: new Date(),
        input: { trigger, kind: query.kind, value: query.value, sort: query.sort, pages: query.pages } as Prisma.InputJsonValue,
      },
    });
    summary.runs++;
    try {
      const result = await collectQuery(query, run.id, ctx);
      summary.found += result.found;
      summary.kept += result.kept;
      summary.rejected += result.rejected;
      await prisma.discoveryRun.update({
        where: { id: run.id },
        data: {
          status: "DONE",
          found: result.found,
          kept: result.kept,
          rejected: result.rejected,
          rejections: result.rejections as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      await prisma.discoveryQuery.update({ where: { id: query.id }, data: { lastRunAt: new Date() } });
      ctx.log("pauta concluída", { pauta: query.id, achados: result.found, mantidos: result.kept, descartados: result.rejected });
    } catch (error) {
      summary.failedRuns++;
      const message = error instanceof Error ? error.message : String(error);
      await prisma.discoveryRun.update({ where: { id: run.id }, data: { status: "FAILED", error: message.slice(0, 500), finishedAt: new Date() } });
      ctx.log("pauta falhou", { pauta: query.id, erro: message });
    }
  }

  await selectAndImport(ctx, summary, queryInfo);
  return summary;
}

/** Chamada pelo worker: uma rodada por dia, a partir de DISCOVERY_HOUR, só com DISCOVERY_ENABLED=true. */
export async function runDailyDiscoveryIfDue(now = new Date(), log: Logger = silent): Promise<RunSummary | null> {
  const config = discoveryConfig();
  if (!config.enabled || saoPauloHour(now) < config.hour) return null;
  const already = await prisma.discoveryRun.count({
    where: { createdAt: { gte: saoPauloDayStart(now) }, input: { path: ["trigger"], equals: "daily" } },
  });
  if (already > 0) return null;
  return runDiscovery({ trigger: "daily", now, log });
}
