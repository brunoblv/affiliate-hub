import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";
import { Channel, type AffiliateLink, type Product } from "@/lib/generated/prisma/client";
import { publishToFacebook } from "./publish-to-facebook";
import { publishToChannelGroups } from "./publish-to-channel-group";

export interface AttachAffiliateLinkInput {
  productId: string;
  affiliateUrl: string;
  /** Quando o link vem da lista de "produtos pendentes" de um ProductSource descoberto automaticamente. */
  productSourceId?: string;
  subId?: string;
}

/**
 * Gatilho central: assim que um link de afiliado é cadastrado para o canal
 * Facebook, publica automaticamente na Página do projeto do produto e
 * enfileira a publicação nos grupos (fluxo assistido) — o mesmo caminho seja
 * o produto vindo da descoberta automática (Mercado Livre/TikTok) ou
 * cadastrado manualmente (Amazon/Shopee, spec §5 "mesmo esquema"). Produtos
 * não viram post de blog automaticamente — ficam só na aba Produtos/Ofertas;
 * posts de blog são só os "roundup" manuais (admin/blog).
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
  const otherChannelsResult = await publishToOtherChannels(product, input.affiliateUrl, input.subId);

  logger.info("AFFILIATE_SYNC", "Link de afiliado cadastrado — publicação automática disparada", {
    productId: product.id,
    ...facebookResult,
    ...otherChannelsResult,
  });

  return { link, ...facebookResult };
}

/**
 * Além do Facebook, publica automaticamente nos grupos de Telegram/WhatsApp
 * do mesmo projeto (spec: um único cadastro de link deve valer pros 3
 * canais — antes disso, cada canal exigia um cadastro manual separado na
 * tela do produto). Reaproveita a mesma URL de afiliado; sem efeito nos
 * projetos sem canal Telegram/WhatsApp configurado.
 */
async function publishToOtherChannels(product: Product, affiliateUrl: string, subId?: string) {
  let telegramPublished = 0;
  let whatsappPublished = 0;

  for (const channel of [Channel.TELEGRAM, Channel.WHATSAPP] as const) {
    let link = await prisma.affiliateLink.findFirst({ where: { productId: product.id, channel } });
    if (!link) {
      link = await prisma.affiliateLink.create({
        data: { productId: product.id, platform: product.source, channel, affiliateUrl, subId },
      });
    } else if (link.affiliateUrl !== affiliateUrl) {
      link = await prisma.affiliateLink.update({ where: { id: link.id }, data: { affiliateUrl } });
    }

    const result = await publishToChannelGroups(product, link as AffiliateLink, channel);
    if (channel === Channel.TELEGRAM) telegramPublished = result.published;
    else whatsappPublished = result.published;
  }

  return { telegramPublished, whatsappPublished };
}
