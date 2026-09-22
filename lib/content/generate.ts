import { prisma } from "@/lib/db";
import { generateJson, isGeminiConfigured, type GeminiResult } from "@/lib/gemini";
import { buildPrompt, RESPONSE_SCHEMA, specsFrom, type ContentInput } from "./prompt";
import { PROMPT_VERSION, SECTION_KEYS, type ContentIssue, type ContentSections, type SectionKey } from "./types";
import { asSections, sanitizeSections, validateSections } from "./validate";

/** Uma geração "presa" além disso é considerada perdida (worker/servidor caiu) e pode ser refeita. */
export const STALE_GENERATION_MS = 5 * 60 * 1000;

export interface GenerateDeps {
  generate: (options: { prompt: string; schema: Record<string, unknown> }) => Promise<GeminiResult<unknown>>;
  now: () => Date;
}

const defaultDeps: GenerateDeps = {
  generate: (options) => generateJson<unknown>({ ...options, maxOutputTokens: 4096 }),
  now: () => new Date(),
};

export type GenerateOutcome = { ok: true } | { ok: false; error: string };

/**
 * Reserva a geração de forma atômica: só uma por produto. Chamada pelo admin antes de
 * responder ao navegador, para a tela já mostrar "gerando" enquanto o modelo trabalha.
 */
export async function claimGeneration(productId: string, now = new Date()): Promise<boolean> {
  await prisma.productContent.upsert({ where: { productId }, create: { productId }, update: {} });
  const claimed = await prisma.productContent.updateMany({
    where: {
      productId,
      OR: [
        { status: { not: "GENERATING" } },
        { status: "GENERATING", generationStartedAt: { lt: new Date(now.getTime() - STALE_GENERATION_MS) } },
      ],
    },
    data: { status: "GENERATING", generationStartedAt: now, error: null },
  });
  return claimed.count > 0;
}

/**
 * Une o texto novo com o existente: seções protegidas (editadas à mão) nunca são
 * sobrescritas, e uma regeneração parcial só troca as seções pedidas.
 */
export function mergeSections(
  existing: ContentSections | null,
  fresh: ContentSections,
  protectedKeys: string[],
  only?: SectionKey[],
): ContentSections {
  if (!existing) return fresh;
  const merged = { ...fresh } as Record<SectionKey, unknown>;
  for (const key of SECTION_KEYS) {
    const keep = protectedKeys.includes(key) || (only && !only.includes(key));
    if (keep) merged[key] = existing[key];
  }
  return merged as unknown as ContentSections;
}

/** Só gera com o que existe de fato: sem fonte, o modelo teria que inventar. */
export function hasEnoughSource(input: ContentInput): boolean {
  return (
    (input.materialDeReferencia?.trim().length ?? 0) >= 80 ||
    input.produto.especificacoes.length >= 2 ||
    (input.produto.resumoCadastrado?.length ?? 0) >= 80
  );
}

async function loadInput(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      niches: { include: { niche: true } },
      category: true,
      variants: { orderBy: [{ isDefault: "desc" }, { label: "asc" }] },
      content: true,
    },
  });
  if (!product) return null;
  const sourceMaterial = product.content?.sourceMaterial?.trim() || null;
  const input: ContentInput = {
    produto: {
      nome: product.name,
      marca: product.brand,
      modelo: product.model,
      gtin: product.gtin,
      nichos: product.niches.map((item) => item.niche.name),
      categoria: product.category?.name ?? null,
      variacoes: product.variants.filter((v) => !v.isDefault).map((v) => v.label),
      resumoCadastrado: product.summary,
      especificacoes: specsFrom(product.specs),
    },
    materialDeReferencia: sourceMaterial,
  };
  return { product, input, sourceMaterial };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

/**
 * Gera (ou regenera) o conteúdo. Idempotente por produto: existe uma linha só, e a
 * reserva atômica impede duas gerações simultâneas. Falha deixa o registro em FAILED
 * com o motivo, e "tentar de novo" reaproveita a mesma linha.
 */
export async function generateContent(
  productId: string,
  options: { only?: SectionKey[]; /** a reserva já foi feita por claimGeneration */ claimed?: boolean } = {},
  overrides: Partial<GenerateDeps> = {},
): Promise<GenerateOutcome> {
  const deps = { ...defaultDeps, ...overrides };
  const loaded = await loadInput(productId);
  if (!loaded) return { ok: false, error: "Produto não encontrado." };
  const { input, sourceMaterial } = loaded;

  if (!options.claimed && !(await claimGeneration(productId, deps.now()))) {
    return { ok: false, error: "Já existe uma geração em andamento para este produto." };
  }

  const fail = async (error: string): Promise<GenerateOutcome> => {
    await prisma.productContent.update({ where: { productId }, data: { status: "FAILED", error } });
    return { ok: false, error };
  };

  if (!hasEnoughSource(input)) {
    return fail("Falta fonte: cole o material do fabricante, cadastre ao menos 2 especificações ou escreva um resumo com mais detalhes.");
  }

  try {
    const result = await deps.generate({ prompt: buildPrompt(input), schema: RESPONSE_SCHEMA as unknown as Record<string, unknown> });
    const fresh = sanitizeSections(result.data);
    // Modo de uso sem material do fabricante nunca é aceito, mesmo que o modelo o devolva.
    if (!sourceMaterial) fresh.howToUse = null;

    const current = await prisma.productContent.findUniqueOrThrow({ where: { productId } });
    const existing = current.sections ? asSections(current.sections) : null;
    const sections = mergeSections(existing, fresh, current.protectedKeys, options.only);

    const issues = validateSections(sections, sourceMaterial);
    const pendencies = [
      ...(!sourceMaterial ? ["Sem material de referência do fabricante: o texto usa só os dados cadastrados."] : []),
      ...(sourceMaterial && !sections.howToUse ? ["Modo de uso ausente: o material informado não traz instruções."] : []),
    ];

    await prisma.productContent.update({
      where: { productId },
      data: {
        status: "DRAFT",
        sections: sections as unknown as object,
        issues: issues as unknown as object,
        pendencies,
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputSnapshot: input as unknown as object,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        error: null,
        generatedAt: deps.now(),
        reviewedAt: null,
        publishedAt: null,
      },
    });
    return { ok: true };
  } catch (error) {
    return fail(message(error));
  }
}

export const isGenerationStale = (startedAt: Date | null, now = new Date()) =>
  !startedAt || now.getTime() - startedAt.getTime() > STALE_GENERATION_MS;

export { isGeminiConfigured };
export type { ContentIssue };
