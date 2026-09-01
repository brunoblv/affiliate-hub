"use server";

import { revalidatePath } from "next/cache";
import { Destino, ModoProjeto } from "@/lib/database";
import { atualizarConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import { gerarLandingDoDestino, type ResultadoGeracaoLanding } from "@/lib/vitrine/gerar";

export interface VitrineFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

function revalidarVitrine(slug?: string): void {
  revalidatePath("/vitrine");
  revalidatePath("/admin/vitrine");
  revalidatePath("/admin/fila");
  revalidatePath("/");
  if (slug) revalidatePath(`/vitrine/${slug}`);
}

const MODOS = new Set<string>(Object.values(ModoProjeto));
const DESTINOS = new Set<string>(Object.values(Destino));

function inteiro(valor: FormDataEntryValue | null, min: number, max: number, padrao: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function salvarConfiguracaoVitrineAction(
  _prev: VitrineFormState,
  formData: FormData,
): Promise<VitrineFormState> {
  const destino = String(formData.get("destino") ?? "");
  if (!DESTINOS.has(destino)) {
    return { status: "error", message: "Destino inválido." };
  }

  const modo = String(formData.get("modo") ?? "NORMAL");
  if (!MODOS.has(modo)) {
    return { status: "error", message: "Modo inválido." };
  }

  const tetoAcessivel = Number(formData.get("tetoAcessivel"));
  const tetoIntermediario = Number(formData.get("tetoIntermediario"));
  if (!Number.isFinite(tetoAcessivel) || tetoAcessivel <= 0) {
    return { status: "error", message: "Teto da faixa acessível inválido." };
  }
  if (!Number.isFinite(tetoIntermediario) || tetoIntermediario <= tetoAcessivel) {
    return { status: "error", message: "Teto intermediário precisa ser maior que o acessível." };
  }

  await atualizarConfiguracaoVitrine(destino as Destino, {
    modo: modo as ModoProjeto,
    descontoMinimoPct: inteiro(formData.get("descontoMinimoPct"), 0, 90, 20),
    tetoAcessivel,
    tetoIntermediario,
    cotaAcessivelPct: inteiro(formData.get("cotaAcessivelPct"), 0, 100, 40),
    quantidadeItens: inteiro(formData.get("quantidadeItens"), 4, 40, 16),
    maxPorCategoria: inteiro(formData.get("maxPorCategoria"), 1, 10, 3),
    linkGrupoWhatsapp: String(formData.get("linkGrupoWhatsapp") ?? "").trim() || null,
    linkGrupoTelegram: String(formData.get("linkGrupoTelegram") ?? "").trim() || null,
  });

  revalidarVitrine();
  return { status: "success", message: "Configuração da vitrine salva." };
}

export async function gerarLandingAgoraAction(destino: Destino): Promise<ResultadoGeracaoLanding> {
  const resultado = await gerarLandingDoDestino(destino, { forcar: true });
  revalidarVitrine(resultado.slug);
  return resultado;
}
