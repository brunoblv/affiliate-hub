import { prisma, CategoriaEditorial } from "@/lib/database";

const SEM_REGISTRO =
  "(nenhum registro pessoal cadastrado ainda em /admin/jornada — escreva de forma mais genérica, sem inventar nenhum detalhe pessoal específico)";

/**
 * Monta o contexto real da jornada pessoal do usuário para a `categoria`
 * dada, a partir dos blocos livres cadastrados em /admin/jornada. Usado
 * tanto na sugestão de temas quanto na escrita do artigo das categorias
 * JORNADA_APARTAMENTO (Meu Novo Lar) e JORNADA_ESPIRITUAL (Mago da Meia
 * Noite), pra Gemini ter fatos reais em vez de inventar. Registros antigos
 * (categoriaEditorial nula) contam como JORNADA_APARTAMENTO, pra não perder
 * contexto já cadastrado antes desse campo existir.
 */
export async function contextoJornada(categoria: CategoriaEditorial = CategoriaEditorial.JORNADA_APARTAMENTO): Promise<string> {
  const notas = await prisma.notaJornada.findMany({
    where:
      categoria === CategoriaEditorial.JORNADA_APARTAMENTO
        ? { OR: [{ categoriaEditorial: categoria }, { categoriaEditorial: null }] }
        : { categoriaEditorial: categoria },
    orderBy: { criadoEm: "asc" },
    select: { texto: true },
  });

  if (notas.length === 0) return SEM_REGISTRO;

  return notas.map((nota, indice) => `### Registro ${indice + 1}\n${nota.texto}`).join("\n\n");
}
