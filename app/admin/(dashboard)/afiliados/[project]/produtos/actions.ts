"use server";

import { revalidatePath } from "next/cache";
import { attachAffiliateLinkAndPublish } from "@/lib/affiliate/attach-link";

/**
 * Ação da lista "Pendentes de link" (produtos descobertos automaticamente,
 * ainda sem link de afiliado cadastrado). Ao salvar, dispara a publicação
 * automática no Facebook (Página + fila de grupos) e o post de blog —
 * docs/especificacao-automacao-produtos-chartfm.md §13/§14.
 */
export async function setAffiliateLinkAction(productId: string, productSourceId: string, formData: FormData) {
  const affiliateUrl = String(formData.get("affiliateUrl") ?? "").trim();
  if (!affiliateUrl) throw new Error("URL de afiliado é obrigatória.");

  await attachAffiliateLinkAndPublish({ productId, affiliateUrl, productSourceId });

  revalidatePath("/admin/afiliados");
}
