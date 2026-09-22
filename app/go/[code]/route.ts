import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * Redirecionamento de afiliado (RF-12).
 *
 * O código identifica UMA oferta específica: nunca é trocada por outra mais
 * barata. Só sai daqui a URL do link de afiliado cadastrado, jamais a URL crua da
 * loja. Código inexistente ou link desativado cai na comparação do produto (ou na
 * busca), não num beco sem saída. O clique é gravado depois da resposta, sem
 * atrasar o redirecionamento; clique não prova compra nem comissão.
 */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  const link = await prisma.affiliateLink.findUnique({
    where: { shortCode: code },
    include: {
      offer: {
        include: {
          store: true,
          variant: { include: { product: { select: { id: true, slug: true, status: true } } } },
        },
      },
    },
  });

  const product = link?.offer.variant.product;
  const usable =
    link && link.active && link.offer.active && link.offer.store.active && product?.status === "PUBLISHED";

  if (!link || !usable || !product) {
    redirect(product?.status === "PUBLISHED" ? `/produto/${product.slug}` : "/busca");
  }

  const source = originPath(request);
  after(async () => {
    try {
      await prisma.click.create({
        data: {
          linkId: link.id,
          offerId: link.offerId,
          productId: product.id,
          storeId: link.offer.storeId,
          source,
        },
      });
    } catch (error) {
      console.error("[clique] falha ao registrar", error);
    }
  });

  redirect(link.url);
}

/** Caminho da página de onde veio o clique, só se for do próprio site. */
function originPath(request: Request): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.host === new URL(request.url).host ? url.pathname : null;
  } catch {
    return null;
  }
}
