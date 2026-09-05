import { CategoriaEditorial, ContentType, TipoPost, type Post } from "@/lib/database";

/**
 * Classificação usada nas regras de cadência/mix do Facebook — ver
 * docs/hub/regras-postagem-facebook.md. Calculada uma vez, no momento em que
 * a Publicacao é criada, a partir da origem do conteúdo.
 */

export function contentTypeDoProduto(): ContentType {
  return ContentType.OFERTA_INDIVIDUAL;
}

export function contentTypeDaLista(): ContentType {
  return ContentType.SELECAO;
}

export function contentTypeDaLanding(): ContentType {
  return ContentType.SELECAO;
}

export function contentTypeDaJornada(post: Pick<Post, "tipo" | "categoriaEditorial">): ContentType {
  if (post.tipo !== TipoPost.JORNADA) {
    throw new Error(`contentTypeDaJornada chamado com post tipo ${post.tipo}, esperava JORNADA.`);
  }
  return post.categoriaEditorial === CategoriaEditorial.JORNADA_APARTAMENTO
    ? ContentType.NARRATIVA_PESSOAL
    : ContentType.CONTEUDO_BLOG;
}
