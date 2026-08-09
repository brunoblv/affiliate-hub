import { Channel, ContentType } from "@/lib/generated/prisma/client";

/** Canal de distribuição → tipo de conteúdo padrão gerado para esse canal. */
export const CHANNEL_TO_CONTENT_TYPE: Record<Channel, ContentType> = {
  FACEBOOK: ContentType.FACEBOOK_POST,
  INSTAGRAM: ContentType.INSTAGRAM_POST,
  TIKTOK: ContentType.TIKTOK_VIDEO,
  TELEGRAM: ContentType.TELEGRAM_POST,
  WEBSITE: ContentType.BLOG_ARTICLE,
  BLOG: ContentType.BLOG_ARTICLE,
  PINTEREST: ContentType.INSTAGRAM_POST,
  OUTROS: ContentType.FACEBOOK_POST,
};

/** Tipo de conteúdo → canal correspondente, usado ao publicar (Publisher por canal, spec §19). */
export const CONTENT_TYPE_TO_CHANNEL: Record<ContentType, Channel> = {
  FACEBOOK_POST: Channel.FACEBOOK,
  INSTAGRAM_POST: Channel.INSTAGRAM,
  INSTAGRAM_STORY: Channel.INSTAGRAM,
  INSTAGRAM_REEL: Channel.INSTAGRAM,
  TIKTOK_VIDEO: Channel.TIKTOK,
  TELEGRAM_POST: Channel.TELEGRAM,
  BLOG_ARTICLE: Channel.BLOG,
};
