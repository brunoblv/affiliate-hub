import { prisma } from "@/lib/database";

const SEM_REGISTRO =
  "(nenhum registro pessoal cadastrado ainda em /admin/jornada — escreva de forma mais genérica, sem inventar nenhum detalhe pessoal específico)";

/**
 * Monta o contexto real da jornada de compra/mudança de apartamento do
 * usuário, a partir dos blocos livres cadastrados em /admin/jornada.
 * Usado tanto na sugestão de temas quanto na escrita do artigo da
 * categoria JORNADA_APARTAMENTO, pra Gemini ter fatos reais em vez de
 * inventar.
 */
export async function contextoJornada(): Promise<string> {
  const notas = await prisma.notaJornada.findMany({
    orderBy: { criadoEm: "asc" },
    select: { texto: true },
  });

  if (notas.length === 0) return SEM_REGISTRO;

  return notas.map((nota, indice) => `### Registro ${indice + 1}\n${nota.texto}`).join("\n\n");
}
