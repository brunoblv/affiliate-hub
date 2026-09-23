"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "./guard";
import { communityInvite, communityTypes } from "@/lib/communities/validation";

export async function saveCommunity(form: FormData) {
  await requireAdmin();
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/admin/comunidades?erro=${encodeURIComponent(message)}`);
  const type = text("type");
  if (!Object.hasOwn(communityTypes, type)) fail("Escolha um tipo de comunidade válido.");
  const platform = type.startsWith("WHATSAPP_") ? "WHATSAPP" : "TELEGRAM";
  const kind = type.endsWith("_GROUP") ? "GROUP" : "CHANNEL";
  const inviteUrl = communityInvite(text("inviteUrl"), platform, kind);
  if (!inviteUrl) fail("Informe um convite HTTPS válido da plataforma, sem parâmetros ou fragmentos.");
  const name = text("name");
  const position = Number(text("position"));
  if (!name || name.length > 120) fail("Informe um nome de até 120 caracteres.");
  if (!Number.isSafeInteger(position) || position < 0 || position > 10000) fail("A ordem deve estar entre 0 e 10000.");
  const publicationId = text("publicationId") || null;
  if (publicationId && publicationId.length > 200) fail("Identificador de publicação muito longo.");
  const nicheId = text("nicheId");
  if (!await prisma.niche.findUnique({ where: { id: nicheId }, select: { id: true } })) fail("Escolha um nicho existente.");
  const data = { name, nicheId, platform, kind, inviteUrl: inviteUrl!, publicationId, position, active: form.get("active") === "on" } as const;
  try {
    if (text("id")) await prisma.community.update({ where: { id: text("id") }, data });
    else await prisma.community.create({ data });
  } catch {
    fail("Não foi possível salvar a comunidade. Atualize a página e tente novamente.");
  }
  revalidatePath("/admin/comunidades");
  revalidatePath("/comunidades");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/produto/[slug]", "page");
  redirect("/admin/comunidades?salvo=1");
}
