"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { attachMlOffer } from "@/lib/discovery/ml-match";
import { mercadoLivreConnector } from "@/lib/connectors/mercado-livre";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

function backTo(data: FormData): string {
  const raw = text(data, "voltar");
  return raw.startsWith("/admin/correspondencias") ? raw : "/admin/correspondencias";
}

function go(back: string, param: "aviso" | "erro", message: string): never {
  const separator = back.includes("?") ? "&" : "?";
  redirect(`${back}${separator}${param}=${encodeURIComponent(message)}`);
}

function httpUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "É este": cria a oferta do Mercado Livre e dispensa as outras sugestões do produto. */
export async function acceptMatch(data: FormData) {
  await requireAdmin();
  const back = backTo(data);
  const suggestion = await prisma.matchSuggestion.findUnique({
    where: { id: text(data, "id") },
    include: { product: { include: { variants: true } } },
  });
  if (!suggestion) go(back, "erro", "Sugestão não encontrada (talvez já tenha sido tratada).");

  const affiliateRaw = text(data, "affiliateUrl");
  const affiliateUrl = httpUrl(affiliateRaw);
  if (affiliateRaw && !affiliateUrl) go(back, "erro", "Link de afiliado inválido (use http/https).");

  const store = await prisma.store.findFirst({ where: { connector: mercadoLivreConnector.key, active: true } });
  if (!store) go(back, "erro", "Cadastre a loja Mercado Livre em /admin/lojas escolhendo o conector do Mercado Livre.");
  const variant = suggestion.product.variants.find((v) => v.isDefault) ?? suggestion.product.variants[0];
  if (!variant) go(back, "erro", "O produto não tem variação.");

  let ok = false;
  try {
    ok = await attachMlOffer(suggestion.productId, variant.id, store, suggestion.catalogId, affiliateUrl);
  } catch (error) {
    go(back, "erro", `O Mercado Livre não respondeu: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
  }
  if (!ok) go(back, "erro", "O Mercado Livre não tem anúncio ativo para esse produto agora.");

  await prisma.$transaction([
    prisma.matchSuggestion.update({ where: { id: suggestion.id }, data: { status: "ACCEPTED" } }),
    prisma.matchSuggestion.updateMany({
      where: { productId: suggestion.productId, status: "PENDING", NOT: { id: suggestion.id } },
      data: { status: "REJECTED" },
    }),
  ]);
  revalidatePath(`/admin/produtos/${suggestion.productId}`);
  go(
    back,
    "aviso",
    affiliateUrl
      ? "Oferta do Mercado Livre criada."
      : "Oferta criada, mas sem link de afiliado: ela só aparece no site depois que você colar o link na oferta.",
  );
}

/** "Nenhum serve": descarta as sugestões pendentes do produto. */
export async function rejectMatches(data: FormData) {
  await requireAdmin();
  const back = backTo(data);
  await prisma.matchSuggestion.updateMany({
    where: { productId: text(data, "productId"), status: "PENDING" },
    data: { status: "REJECTED" },
  });
  go(back, "aviso", "Sugestões descartadas.");
}
