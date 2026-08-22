import { Rede, type Produto } from "@/lib/generated/prisma/client";

/**
 * Texto do post social, montado por template determinístico.
 *
 * Regra inegociável: nada aqui pode ser inventado. Preço, preço original e
 * desconto só aparecem se vierem da API da plataforma. Sem IA — o valor
 * editorial está no blog, não na legenda.
 */

const AVISO_AFILIADO = "Link de afiliado — compro nada a mais por você, e ajuda o site.";

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
      linhas.push("Detalhes e comparação no site:");
      break;
    case Rede.INSTAGRAM:
      // No Instagram o link da legenda não é clicável.
      linhas.push("Link na bio.");
      break;
    case Rede.TELEGRAM:
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
