import { prisma } from "@/lib/database";
import type { NivelLog } from "@/lib/generated/prisma/client";

/**
 * Log mínimo em banco. Serve para uma pergunta só: "por que esse post não
 * saiu?". Sem pino, sem arquivo, sem serviço externo.
 */
export async function registrar(
  nivel: NivelLog,
  area: string,
  mensagem: string,
  contexto?: Record<string, unknown>,
): Promise<void> {
  const linha = `[${nivel}] ${area}: ${mensagem}`;
  if (nivel === "ERRO") console.error(linha, contexto ?? "");
  else console.log(linha, contexto ?? "");

  try {
    await prisma.log.create({ data: { nivel, area, mensagem, contexto: contexto as never } });
  } catch {
    // Log nunca pode derrubar o fluxo que o chamou.
  }
}

/** Remove logs antigos. Chamar uma vez por dia no worker. */
export async function limparLogsAntigos(dias = 30): Promise<number> {
  const { count } = await prisma.log.deleteMany({
    where: { criadoEm: { lt: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) } },
  });
  return count;
}
