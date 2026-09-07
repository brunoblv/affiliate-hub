import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { subIdsDaOrigem } from "@/lib/shopee/etiquetas";
import { resolverLinkAfiliadoEtiquetado } from "@/lib/shopee/link-etiquetado";

export interface RegisterClickInput {
  codigoCurto: string;
  origem?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}

/**
 * Registra o clique e retorna o link de afiliado para redirecionamento.
 * Produto: Shopee leva as etiquetas do `?o=`. Lista da loja: o short link
 * já é o afiliado — só registra e redireciona.
 */
export async function registerClick(input: RegisterClickInput): Promise<string | null> {
  const produto = await prisma.produto.findUnique({ where: { codigoCurto: input.codigoCurto } });
  if (produto) {
    if (!produto.ativo) return null;

    await prisma.clique.create({
      data: {
        produtoId: produto.id,
        origem: input.origem ?? undefined,
        visitante: input.ip ?? undefined,
        referer: input.referer ?? undefined,
      },
    });

    logger.info("AFFILIATE_SYNC", "Clique registrado", { codigoCurto: input.codigoCurto, produtoId: produto.id });

    return resolverLinkAfiliadoEtiquetado(produto, subIdsDaOrigem(input.origem));
  }

  const lista = await prisma.listaOferta.findUnique({ where: { codigoCurto: input.codigoCurto } });
  if (!lista || !lista.ativo) return null;

  await prisma.clique.create({
    data: {
      listaOfertaId: lista.id,
      origem: input.origem ?? undefined,
      visitante: input.ip ?? undefined,
      referer: input.referer ?? undefined,
    },
  });

  logger.info("AFFILIATE_SYNC", "Clique de lista da loja registrado", {
    codigoCurto: input.codigoCurto,
    listaOfertaId: lista.id,
  });

  return lista.linkAfiliado;
}
