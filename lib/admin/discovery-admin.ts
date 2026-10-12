"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { blockersForProducts } from "@/lib/discovery/publish-gate";
import { importCandidate, matchAcrossSources, runDiscovery } from "@/lib/discovery/run";
import { slugOfBrand } from "@/lib/discovery/brands-seed";
import { getConnector } from "@/lib/connectors";
import { SOURCE_CONNECTOR } from "@/lib/discovery/run";
import { DiscoverySource } from "@/lib/generated/prisma/enums";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const flag = (data: FormData, key: string) => data.get(key) === "on";

function go(back: string, param: "aviso" | "erro", message: string): never {
  const separator = back.includes("?") ? "&" : "?";
  redirect(`${back}${separator}${param}=${encodeURIComponent(message)}`);
}

/** Só volta para dentro do admin (o campo vem do formulário). */
function backTo(data: FormData, fallback: string): string {
  const raw = text(data, "voltar");
  return raw.startsWith(fallback) ? raw : fallback;
}

const MAX_BATCH = 25;

// ---------------------------------------------------------------------------
// Candidatos persistidos
// ---------------------------------------------------------------------------

/** Importa candidatos já gravados como rascunho (preço, link e fotos vêm de novo da API). */
export async function importStoredCandidates(data: FormData) {
  await requireAdmin();
  const back = backTo(data, "/admin/candidatos");
  const ids = [...new Set(data.getAll("sel").map(String))].slice(0, MAX_BATCH);
  if (ids.length === 0) go(back, "erro", "Marque pelo menos um candidato.");

  const nicheIds = data.getAll("nicheIds").map(String).filter(Boolean);
  const categoryId = text(data, "categoryId") || null;
  const candidates = await prisma.productCandidate.findMany({ where: { id: { in: ids }, status: { in: ["NEW", "SELECTED", "UNAVAILABLE"] } } });

  let imported = 0;
  let unavailable = 0;
  let already = 0;
  let failed = 0;
  let toReview = 0;
  for (const candidate of candidates) {
    const { outcome, productId } = await importCandidate(candidate, { nicheIds, categoryId });
    if (outcome === "imported" && productId) {
      imported++;
      if ((await matchAcrossSources(candidate, productId).catch(() => "none" as const)) === "review") toReview++;
    } else if (outcome === "unavailable") unavailable++;
    else if (outcome === "duplicate") already++;
    else failed++;
    const connector = getConnector(SOURCE_CONNECTOR[candidate.source]);
    await new Promise((resolve) => setTimeout(resolve, connector?.limits.minIntervalMs ?? 400));
  }

  revalidatePath("/admin/produtos");
  const parts = [`${imported} ${imported === 1 ? "produto importado" : "produtos importados"} como rascunho`];
  if (toReview) parts.push(`${toReview} com correspondência para confirmar em Correspondências`);
  if (unavailable) parts.push(`${unavailable} sem link de afiliado ou fora do ar`);
  if (already) parts.push(`${already} já cadastrados`);
  if (failed) parts.push(`${failed} falharam (tente de novo)`);
  go(back, "aviso", `${parts.join(" · ")}.`);
}

/** Rejeição é decisão: o candidato nunca volta, nem em rodadas futuras. */
export async function rejectCandidates(data: FormData) {
  await requireAdmin();
  const back = backTo(data, "/admin/candidatos");
  const ids = data.getAll("sel").map(String);
  if (ids.length === 0) go(back, "erro", "Marque pelo menos um candidato.");
  const reason = text(data, "motivo").slice(0, 120) || "rejeitado no admin";
  const { count } = await prisma.productCandidate.updateMany({
    where: { id: { in: ids }, status: { notIn: ["IMPORTED"] } },
    data: { status: "REJECTED", statusReason: reason },
  });
  go(back, "aviso", `${count} ${count === 1 ? "candidato rejeitado" : "candidatos rejeitados"}.`);
}

/** "Marca errada": o classificador errou; o candidato volta como indefinido (sem marca). */
export async function flagWrongBrand(data: FormData) {
  await requireAdmin();
  const back = backTo(data, "/admin/candidatos");
  await prisma.productCandidate.updateMany({
    where: { id: text(data, "id"), status: { not: "IMPORTED" } },
    data: { brandId: null, tier: "UNKNOWN" },
  });
  go(back, "aviso", "Marca removida do candidato.");
}

/** Publicação em lote da fila de revisão: só passa quem não tem pendência no portão. */
export async function publishReady(data: FormData) {
  await requireAdmin();
  const back = backTo(data, "/admin/candidatos");
  const ids = [...new Set(data.getAll("sel").map(String))];
  if (ids.length === 0) go(back, "erro", "Marque pelo menos um produto.");
  const blockers = await blockersForProducts(ids);
  const ready = ids.filter((id) => blockers.get(id)?.length === 0);
  const { count } = ready.length
    ? await prisma.product.updateMany({ where: { id: { in: ready }, status: "DRAFT" }, data: { status: "PUBLISHED" } })
    : { count: 0 };
  revalidatePath("/admin/produtos");
  const skipped = ids.length - ready.length;
  go(
    back,
    count > 0 ? "aviso" : "erro",
    `${count} ${count === 1 ? "produto publicado" : "produtos publicados"}${skipped ? ` · ${skipped} com pendência (veja o motivo na linha)` : ""}.`,
  );
}

// ---------------------------------------------------------------------------
// Pautas e rodadas
// ---------------------------------------------------------------------------

const KINDS = ["keyword", "category", "shop", "hot", "promo"];
const SORTS = ["sales", "relevance", "commission", "discount"];

export async function saveQuery(data: FormData) {
  await requireAdmin();
  const back = "/admin/descoberta";
  const id = text(data, "id");
  const source = (Object.values(DiscoverySource) as string[]).includes(text(data, "source"))
    ? (text(data, "source") as DiscoverySource)
    : null;
  const kind = text(data, "kind");
  const sort = text(data, "sort") || "sales";
  const value = text(data, "value") || null;
  if (!source || SOURCE_CONNECTOR[source] === null) go(back, "erro", "Escolha uma fonte válida.");
  if (!KINDS.includes(kind)) go(back, "erro", "Tipo de pauta inválido.");
  if (!SORTS.includes(sort)) go(back, "erro", "Ordenação inválida.");
  if (["keyword", "category", "shop"].includes(kind) && !value) go(back, "erro", "Informe a palavra-chave, a categoria ou a loja.");
  if (kind === "category" && !/^\d+$/.test(value ?? "")) go(back, "erro", "A categoria é o ID numérico.");

  const fields = {
    source,
    kind,
    value,
    sort,
    pages: Math.min(10, Math.max(1, Number.parseInt(text(data, "pages"), 10) || 2)),
    quota: Math.max(0, Number.parseInt(text(data, "quota"), 10) || 0),
    nicheId: text(data, "nicheId") || null,
    categoryId: text(data, "categoryId") || null,
    active: flag(data, "active"),
    position: Number.parseInt(text(data, "position"), 10) || 0,
  };
  if (id) await prisma.discoveryQuery.update({ where: { id }, data: fields });
  else await prisma.discoveryQuery.create({ data: fields });
  go(back, "aviso", "Pauta salva.");
}

export async function deleteQuery(data: FormData) {
  await requireAdmin();
  await prisma.discoveryQuery.delete({ where: { id: text(data, "id") } }).catch(() => undefined);
  go("/admin/descoberta", "aviso", "Pauta removida (o histórico de rodadas fica).");
}

/** "Rodar agora": pedido explícito do admin, vale mesmo com DISCOVERY_ENABLED=false. */
export async function runQueryNow(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const summary = await runDiscovery({ force: true, trigger: "manual", queryIds: id ? [id] : undefined });
  revalidatePath("/admin/candidatos");
  go(
    "/admin/descoberta",
    summary.failedRuns > 0 && summary.found === 0 ? "erro" : "aviso",
    `${summary.found} achados · ${summary.kept} mantidos · ${summary.rejected} descartados · ${summary.imported} importados` +
      (summary.failedRuns ? ` · ${summary.failedRuns} pauta(s) falharam (veja o histórico)` : "") +
      ".",
  );
}

// ---------------------------------------------------------------------------
// Marcas e termos bloqueados
// ---------------------------------------------------------------------------

const splitList = (raw: string) =>
  [...new Set(raw.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];

export async function saveBrand(data: FormData) {
  await requireAdmin();
  const back = "/admin/marcas";
  const id = text(data, "id");
  const name = text(data, "name");
  if (name.length < 2) go(back, "erro", "Informe o nome da marca.");
  const slug = slugOfBrand(name);
  if (!slug) go(back, "erro", "Nome de marca inválido.");
  const fields = {
    name,
    slug,
    aliases: splitList(text(data, "aliases")),
    weight: text(data, "weight") === "2" ? 2 : 1,
    active: id ? flag(data, "active") : true,
  };
  const clash = await prisma.brand.findUnique({ where: { slug } });
  if (clash && clash.id !== id) go(back, "erro", "Já existe uma marca com esse nome.");
  if (id) await prisma.brand.update({ where: { id }, data: fields });
  else await prisma.brand.create({ data: fields });
  go(back, "aviso", "Marca salva. Vale para as próximas rodadas.");
}

export async function deleteBrand(data: FormData) {
  await requireAdmin();
  await prisma.brand.delete({ where: { id: text(data, "id") } }).catch(() => undefined);
  go("/admin/marcas", "aviso", "Marca removida.");
}

export async function addBlockedTerm(data: FormData) {
  await requireAdmin();
  const terms = splitList(text(data, "term")).map((term) => term.toLowerCase().slice(0, 60));
  for (const term of terms) await prisma.blockedTerm.upsert({ where: { term }, create: { term }, update: {} });
  go("/admin/marcas", "aviso", `${terms.length} termo(s) bloqueado(s).`);
}

export async function removeBlockedTerm(data: FormData) {
  await requireAdmin();
  await prisma.blockedTerm.delete({ where: { id: text(data, "id") } }).catch(() => undefined);
  go("/admin/marcas", "aviso", "Termo liberado.");
}
