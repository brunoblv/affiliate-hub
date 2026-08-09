import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { Channel } from "@/lib/generated/prisma/client";
import { getSiteUrl } from "@/lib/site-url";
import { generateAutoBlogPost } from "@/lib/blog/generate-post";
import { publishToFacebook } from "./publish-to-facebook";

export interface AttachAffiliateLinkInput {
  productId: string;
  affiliateUrl: string;
  /** Quando o link vem da lista de "produtos pendentes" de um ProductSource descoberto automaticamente. */
  productSourceId?: string;
  subId?: string;
}

/**
 * Gatilho central: assim que um link de afiliado é cadastrado para o canal
 * Facebook, publica automaticamente na Página do projeto do produto, enfileira
 * a publicação nos grupos (fluxo assistido) e gera um post de blog automático
 * — o mesmo caminho seja o produto vindo da descoberta automática (Mercado
 * Livre/TikTok) ou cadastrado manualmente (Amazon/Shopee, spec §5 "mesmo
 * esquema").
 */
export async function attachAffiliateLinkAndPublish(input: AttachAffiliateLinkInput) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: input.productId } });

  if (input.productSourceId) {
    await prisma.productSource.update({
      where: { id: input.productSourceId },
      data: { affiliateUrl: input.affiliateUrl },
    });
  }

  let link = await prisma.affiliateLink.findFirst({ where: { productId: product.id, channel: Channel.FACEBOOK } });
  if (!link) {
    link = await prisma.affiliateLink.create({
      data: { productId: product.id, platform: product.source, channel: Channel.FACEBOOK, affiliateUrl: input.affiliateUrl, subId: input.subId },
    });
  } else if (link.affiliateUrl !== input.affiliateUrl) {
    link = await prisma.affiliateLink.update({ where: { id: link.id }, data: { affiliateUrl: input.affiliateUrl } });
  }

  const facebookResult = await publishToFacebook(product, link);

  const trackedUrl = `${getSiteUrl()}/go/${link.shortCode}`;
  const blogPost = await generateAutoBlogPost(product, trackedUrl);

  logger.info("AFFILIATE_SYNC", "Link de afiliado cadastrado — publicação automática disparada", {
    productId: product.id,
    ...facebookResult,
    blogPostId: blogPost.id,
  });

  return { link, blogPost, ...facebookResult };
}
