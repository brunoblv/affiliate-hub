"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { claimGeneration, generateContent } from "@/lib/content/generate";
import { parseSpecsText } from "@/lib/content/prompt";
import { SECTION_KEYS, type ContentSections, type SectionKey } from "@/lib/content/types";
import { asSections, hasErrors, sanitizeSections, validateSections } from "@/lib/content/validate";
import { isGeminiConfigured } from "@/lib/gemini";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const back = (productId: string) => `/admin/produtos/${productId}?aba=conteudo`;

function fail(productId: string, message: string): never {
  redirect(`${back(productId)}&erro=${encodeURIComponent(message)}`);
}
function done(productId: string, message: string): never {
  redirect(`${back(productId)}&aviso=${encodeURIComponent(message)}`);
}

async function touchSite(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (product) revalidatePath(`/produto/${product.slug}`);
}

// ---------------------------------------------------------------------------
// Fontes
// ---------------------------------------------------------------------------

/** Material do fabricante e especificações: as únicas fontes de fatos do texto gerado. */
export async function saveSource(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const sourceMaterial = text(data, "sourceMaterial").slice(0, 20_000) || null;
  const specs = parseSpecsText(text(data, "specs"));

  await prisma.$transaction([
    prisma.productContent.upsert({
      where: { productId },
      create: { productId, sourceMaterial },
      update: { sourceMaterial },
    }),
    prisma.product.update({ where: { id: productId }, data: { specs } }),
  ]);
  done(productId, "Fontes salvas.");
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

async function start(productId: string, only?: SectionKey[]) {
  if (!isGeminiConfigured()) fail(productId, "Gemini não configurado: defina GEMINI_API_KEY no .env.");
  if (!(await claimGeneration(productId))) fail(productId, "Já existe uma geração em andamento para este produto.");
  // O navegador recebe a resposta já mostrando "gerando"; o modelo trabalha depois.
  after(async () => {
    await generateContent(productId, { only, claimed: true }).catch((error) => {
      console.error(JSON.stringify({ message: "geração de conteúdo falhou", productId, erro: error instanceof Error ? error.message : String(error) }));
    });
    await touchSite(productId);
  });
}

export async function startGeneration(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  await start(productId);
  done(productId, "Gerando o texto. A página atualiza sozinha.");
}

/** A seção vem de `bind` no botão (não do formulário): o React troca o `name` de botões com formAction. */
export async function regenerateSection(key: SectionKey, data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  if (!SECTION_KEYS.includes(key)) fail(productId, "Seção inválida.");
  const content = await prisma.productContent.findUnique({ where: { productId } });
  if (content?.protectedKeys.includes(key)) {
    fail(productId, "Essa seção foi editada à mão e está protegida. Marque “Liberar para regeneração” e salve antes.");
  }
  await start(productId, [key]);
  done(productId, "Regenerando a seção. A página atualiza sozinha.");
}

// ---------------------------------------------------------------------------
// Edição e fluxo editorial
// ---------------------------------------------------------------------------

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

/** FAQ em blocos separados por linha em branco: 1ª linha = pergunta, resto = resposta. */
function parseFaq(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((block) => {
      const [question, ...answer] = block.split("\n").map((line) => line.trim()).filter(Boolean);
      return { question: question ?? "", answer: answer.join(" ") };
    })
    .filter((entry) => entry.question && entry.answer);
}

export async function saveContent(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const content = await prisma.productContent.findUnique({ where: { productId } });
  if (!content?.sections) fail(productId, "Ainda não há texto para editar. Gere primeiro.");
  if (content.status === "GENERATING") fail(productId, "Aguarde o fim da geração.");

  const previous = asSections(content.sections);
  const next = sanitizeSections({
    title: text(data, "title"),
    summary: text(data, "summary"),
    description: String(data.get("description") ?? ""),
    benefits: lines(String(data.get("benefits") ?? "")),
    audience: text(data, "audience"),
    howToUse: text(data, "howToUse") || null,
    limitations: lines(String(data.get("limitations") ?? "")),
    faq: parseFaq(String(data.get("faq") ?? "")),
    metaTitle: text(data, "metaTitle"),
    metaDescription: text(data, "metaDescription"),
  });

  // Seção alterada à mão fica protegida; a caixa "liberar" devolve a seção à regeneração.
  const protectedKeys = new Set(content.protectedKeys);
  for (const key of SECTION_KEYS) {
    if (data.get(`release_${key}`) === "on") protectedKeys.delete(key);
    else if (JSON.stringify(previous[key]) !== JSON.stringify(next[key as keyof ContentSections])) protectedKeys.add(key);
  }

  await prisma.productContent.update({
    where: { productId },
    data: {
      sections: next as unknown as object,
      protectedKeys: [...protectedKeys],
      issues: validateSections(next, content.sourceMaterial) as unknown as object,
      // Qualquer edição tira o texto do ar e exige nova revisão.
      status: "DRAFT",
      reviewedAt: null,
      publishedAt: null,
    },
  });
  await touchSite(productId);
  done(productId, "Edição salva. O texto voltou a rascunho e precisa ser revisado de novo.");
}

export async function markReviewed(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const content = await prisma.productContent.findUnique({ where: { productId } });
  if (!content?.sections || content.status !== "DRAFT") fail(productId, "Só um rascunho pode ser marcado como revisado.");
  const issues = validateSections(asSections(content.sections), content.sourceMaterial);
  await prisma.productContent.update({ where: { productId }, data: { issues: issues as unknown as object } });
  if (hasErrors(issues)) fail(productId, "Há problemas a corrigir antes de marcar como revisado.");
  await prisma.productContent.update({ where: { productId }, data: { status: "REVIEWED", reviewedAt: new Date() } });
  done(productId, "Marcado como revisado.");
}

export async function publishContent(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  const content = await prisma.productContent.findUnique({ where: { productId } });
  if (content?.status !== "REVIEWED" || !content.sections) fail(productId, "Revise o texto antes de publicar.");
  // Revalida na hora de publicar: as regras podem ter mudado desde a revisão.
  const issues = validateSections(asSections(content.sections), content.sourceMaterial);
  if (hasErrors(issues)) fail(productId, "O texto tem problemas e não pode ser publicado.");
  await prisma.productContent.update({ where: { productId }, data: { status: "PUBLISHED", publishedAt: new Date(), issues: issues as unknown as object } });
  await touchSite(productId);
  done(productId, "Conteúdo publicado na página do produto.");
}

export async function unpublishContent(data: FormData) {
  await requireAdmin();
  const productId = text(data, "productId");
  await prisma.productContent.updateMany({ where: { productId, status: "PUBLISHED" }, data: { status: "DRAFT", publishedAt: null, reviewedAt: null } });
  await touchSite(productId);
  done(productId, "Conteúdo despublicado.");
}
