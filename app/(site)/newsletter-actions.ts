"use server";

import { prisma } from "@/lib/database";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SubscribeState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function subscribeToNewsletterAction(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return { status: "error", message: "Digite um e-mail válido." };
  }

  await prisma.assinante.upsert({
    where: { email },
    create: { email },
    update: { ativo: true, baixaEm: null },
  });

  return { status: "success", message: "Inscrito! Em breve você recebe nossas dicas por e-mail." };
}
