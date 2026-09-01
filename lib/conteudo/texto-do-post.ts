import { Destino, Rede, type Produto, type Post } from "@/lib/database";

/**
 * Fallback determinístico da legenda social (quando o Gemini falha ou a
 * chave não está configurada). A geração com IA está em gerar-legenda.ts.
 *
 * Regra inegociável: nada aqui pode ser inventado. Preço, preço original e
 * desconto só aparecem se vierem da API da plataforma.
 */

const AVISO_AFILIADO = "Link de afiliado — não custa nada a mais para você, e ajuda o site.";

function reais(valor: unknown): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

function descontoPercentual(atual: unknown, original: unknown): number | null {
  const a = Number(atual);
  const o = Number(original);
  if (!o || o <= a) return null;
  return Math.round(((o - a) / o) * 100);
}

export interface EntradaTexto {
  produto: Produto;
  rede: Rede;
  link: string;
  /** 1-2 frases suas. Sem isso o post fica genérico — vale muito a pena preencher. */
  comentario?: string;
}

export function montarTextoDoPost({ produto, rede, link, comentario }: EntradaTexto): string {
  const desconto = descontoPercentual(produto.precoAtual, produto.precoOriginal);

  const linhas: string[] = [];

  linhas.push(produto.nome);
  linhas.push("");

  if (desconto !== null) {
    linhas.push(`De ${reais(produto.precoOriginal)} por ${reais(produto.precoAtual)} (-${desconto}%)`);
  } else {
    linhas.push(reais(produto.precoAtual));
  }

  if (comentario) {
    linhas.push("");
    linhas.push(comentario);
  }

  linhas.push("");

  switch (rede) {
    case Rede.FACEBOOK_PAGE:
      linhas.push("Pegar agora:");
      break;
    case Rede.INSTAGRAM:
      // No Instagram o link da legenda não é clicável.
      linhas.push("Link na bio.");
      break;
    case Rede.TELEGRAM:
    case Rede.WHATSAPP:
    case Rede.FACEBOOK_GROUP:
      linhas.push("Pegar agora:");
      break;
  }

  if (rede !== Rede.INSTAGRAM) {
    linhas.push(link);
  }

  linhas.push("");
  linhas.push(AVISO_AFILIADO);

  return linhas.join("\n").trim();
}

export interface EntradaTextoDaLista {
  post: Post;
  rede: Rede;
  link: string;
}

/**
 * Texto do post social pra uma Lista (roundup) — sempre aponta pro blog, já
 * que não existe um link de afiliado único pra vários produtos de uma vez.
 * Mesma regra de `montarTextoDoPost`: nada inventado, só título + resumo já
 * salvos no Post.
 */
export function montarTextoDaLista({ post, rede, link }: EntradaTextoDaLista): string {
  const linhas: string[] = [];

  linhas.push(post.titulo);

  if (post.resumo) {
    linhas.push("");
    linhas.push(post.resumo);
  }

  linhas.push("");
  linhas.push(rede === Rede.INSTAGRAM ? "Link na bio." : "Confira a lista completa:");

  if (rede !== Rede.INSTAGRAM) {
    linhas.push(link);
  }

  linhas.push("");
  linhas.push(AVISO_AFILIADO);

  return linhas.join("\n").trim();
}

export interface EntradaTextoDaLanding {
  headline: string;
  resumo: string;
  destino: Destino;
  rede: Rede;
  link: string;
}

/** Legenda da divulgação da landing do dia — aponta pra página, não pra um produto. */
export function montarTextoDaLanding({ headline, resumo, rede, link }: EntradaTextoDaLanding): string {
  const linhas: string[] = [headline];

  if (resumo) {
    linhas.push("", resumo);
  }

  linhas.push("");
  linhas.push(rede === Rede.INSTAGRAM ? "Link na bio." : "Confira as ofertas do dia:");

  if (rede !== Rede.INSTAGRAM) {
    linhas.push(link);
  }

  linhas.push("");
  linhas.push(AVISO_AFILIADO);

  return linhas.join("\n").trim();
}
