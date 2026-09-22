"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalog";
import { money, parseReais } from "@/lib/format";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** Só caminhos internos: impede usar o parâmetro `voltar` para redirecionar para fora. */
function safePath(raw: string, fallback: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

function withParam(path: string, key: string, value: string): string {
  const [base, hash] = path.split("#");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

/** Login sob demanda: quem não entrou volta para a mesma página depois do login. */
async function requireUser(back: string): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) {
    redirect(`/entrar?callbackUrl=${encodeURIComponent(back)}`);
  }
  return id;
}

async function currentLowest(productId: string): Promise<number | null> {
  const product = (await getProductsByIds([productId])).get(productId);
  return product?.prices.lowestCents ?? null;
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------

export async function toggleFavorite(data: FormData) {
  const productId = text(data, "productId");
  const back = safePath(text(data, "voltar"), "/conta");
  const userId = await requireUser(back);

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" } });
    if (!product) redirect(withParam(back, "erro", "Produto indisponível."));
    // Guarda o menor preço do momento para comparar depois; sem oferta atual fica vazio.
    await prisma.favorite.create({
      data: { userId, productId, savedAtCents: await currentLowest(productId) },
    });
  }
  revalidatePath("/conta");
  redirect(back);
}

// ---------------------------------------------------------------------------
// Alertas de preço
// ---------------------------------------------------------------------------

export async function saveAlert(data: FormData) {
  const productId = text(data, "productId");
  const back = safePath(text(data, "voltar"), "/conta");
  const userId = await requireUser(back);
  const fail = (message: string): never => redirect(withParam(back, "erro", message));

  const targetCents = parseReais(text(data, "target"));
  if (targetCents === null) fail("Informe um preço desejado válido, como 199,90.");
  if (targetCents! > 100_000_000) fail("Esse valor é alto demais para um alerta.");

  const product = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" } });
  if (!product) fail("Produto indisponível.");

  const lowest = await currentLowest(productId);
  if (lowest !== null && targetCents! >= lowest) {
    fail(`O preço desejado precisa ser menor que o atual (${money(lowest)}).`);
  }

  await prisma.priceAlert.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, targetCents: targetCents! },
    // Meta nova = alerta rearmado: avisa de novo quando o preço chegar nela.
    update: { targetCents: targetCents!, notifiedAt: null, notifiedPriceCents: null },
  });
  revalidatePath("/conta");
  redirect(withParam(back, "ok", "Alerta salvo."));
}

export async function deleteAlert(data: FormData) {
  const back = safePath(text(data, "voltar"), "/conta");
  const userId = await requireUser(back);
  // deleteMany com userId: ninguém remove o alerta de outra pessoa mesmo forjando o id.
  await prisma.priceAlert.deleteMany({ where: { id: text(data, "id"), userId } });
  revalidatePath("/conta");
  redirect(back);
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

/** Exclui usuário, contas vinculadas, favoritos e alertas (cascata) e encerra a sessão. */
export async function deleteAccount() {
  const userId = await requireUser("/conta");
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/" });
}
