"use server";

import { revalidatePath } from "next/cache";
import { sincronizarPaginasMeta } from "@/lib/meta/credentials";

export interface ReconectarState {
  ok: boolean;
  mensagem: string;
}

export async function reconectarMetaAction(): Promise<ReconectarState> {
  try {
    const paginas = await sincronizarPaginasMeta();
    revalidatePath("/admin/integracoes");
    return { ok: true, mensagem: `${paginas.length} página(s) sincronizada(s).` };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "Falha ao sincronizar." };
  }
}
