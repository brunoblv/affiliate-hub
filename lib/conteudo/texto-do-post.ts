import { Destino, Rede, type Produto, type Post } from "@/lib/database";

/**
 * Texto do post social, montado por template determinístico.
 *
 * Regra inegociável: nada aqui pode ser inventado. Preço, preço original e
 * desconto só aparecem se vierem da API da plataforma. Sem IA — o valor
 * editorial está no blog, não na legenda.
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
      // Destino UMBANDA não tem post no blog — o link vai direto pra oferta.
      linhas.push(produto.destino === Destino.UMBANDA ? "Pegar agora:" : "Detalhes e comparação no site:");
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
