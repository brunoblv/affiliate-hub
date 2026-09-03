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
 * Registra o clique em um Produto e retorna o link de afiliado para
 * redirecionamento. Na Shopee, o destino leva as etiquetas do `?o=`
 * (tipo de post + canal). Usado pela rota /go/[code].
 */
export async function registerClick(input: RegisterClickInput): Promise<string | null> {
  const produto = await prisma.produto.findUnique({ where: { codigoCurto: input.codigoCurto } });
  if (!produto || !produto.ativo) return null;

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
