"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { approvePending, rejectPending } from "@/lib/sync/apply";
import { enqueueNow } from "@/lib/sync/queue";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** Só caminhos internos do admin: o retorno vem de um campo do formulário. */
function back(data: FormData, fallback: string): string {
  const path = text(data, "voltar");
  return path.startsWith("/admin") ? path : fallback;
}

function done(path: string, message: string): never {
  revalidatePath("/admin/precos");
  redirect(`${path}${path.includes("?") ? "&" : "?"}aviso=${encodeURIComponent(message)}`);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Enfileira todas as ofertas com conector, ignorando o ciclo (o worker executa). */
export async function syncAll(data: FormData) {
  await requireAdmin();
  const created = await enqueueNow({});
  done(back(data, "/admin/precos"), created ? `${plural(created, "oferta enfileirada", "ofertas enfileiradas")}.` : "Nada para enfileirar: todas já estão na fila ou não há ofertas com conector.");
}

export async function syncStore(data: FormData) {
  await requireAdmin();
  const created = await enqueueNow({ storeId: text(data, "storeId") });
  done(back(data, "/admin/precos"), created ? `${plural(created, "oferta enfileirada", "ofertas enfileiradas")}.` : "Nenhuma oferta nova para enfileirar nessa loja.");
}

export async function syncOffer(data: FormData) {
  await requireAdmin();
  const created = await enqueueNow({ offerId: text(data, "offerId") });
  done(back(data, "/admin/precos"), created ? "Atualização enfileirada." : "Essa oferta já está na fila, ou a loja não tem conector.");
}

export async function approveReview(data: FormData) {
  await requireAdmin();
  const ok = await approvePending(text(data, "offerId"));
  done(back(data, "/admin/precos"), ok ? "Novo preço aprovado e publicado." : "Não havia valor pendente.");
}

export async function rejectReview(data: FormData) {
  await requireAdmin();
  const ok = await rejectPending(text(data, "offerId"));
  done(back(data, "/admin/precos"), ok ? "Valor recusado; o preço publicado continua o mesmo." : "Não havia valor pendente.");
}

/** Libera uma oferta marcada com erro para nova tentativa imediata (zera a contagem de falhas). */
export async function resetOfferFailures(data: FormData) {
  await requireAdmin();
  const offerId = text(data, "offerId");
  await prisma.offer.update({ where: { id: offerId }, data: { consecutiveFailures: 0, lastAttemptAt: null } });
  const created = await enqueueNow({ offerId });
  done(back(data, "/admin/precos"), created ? "Falhas zeradas e nova coleta enfileirada." : "Falhas zeradas.");
}
