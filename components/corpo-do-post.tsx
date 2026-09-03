import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import { prisma } from "@/lib/database";
import { separarBlocos, produtosReferenciados } from "@/lib/conteudo/corpo";
import { produtoVisivelNoSite } from "@/lib/produtos";
import { CardProdutoDestaque, CardProdutoGrade } from "@/components/site/card-produto";

/**
 * Renderiza o corpo do post: markdown normal, imagens no meio do texto,
 * cards de produto em [produto:slug] e botão de lista em [cta:url].
 *
 * Server Component — os produtos vêm do banco em uma consulta só, sem cascata
 * de fetch por card.
 */

interface Props {
  corpo: string;
  /** Valor de `?o=` do /go — tipo de post e, se veio de uma rede, a etiqueta do canal. */
  origem?: string;
}

export async function CorpoDoPost({ corpo, origem = "blog" }: Props) {
  const blocos = separarBlocos(corpo);
  const slugs = produtosReferenciados(corpo);

  const produtos = slugs.length
    ? await prisma.produto.findMany({ where: { slug: { in: slugs }, ativo: true } })
    : [];
  const visiveis = produtos.filter(produtoVisivelNoSite);

  const porSlug = new Map(visiveis.map((produto) => [produto.slug, produto]));

  // Blocos de produto consecutivos (ex: vários [produto:slug] seguidos, sem
  // texto entre eles) viram um grid, pra caber lado a lado em vez de um card
  // largo empilhado por produto. Um produto sozinho vira card de destaque.
  const grupos = agruparProdutosConsecutivos(blocos);

  return (
    <div className="not-prose flex flex-col gap-8">
      {grupos.map((grupo, indice) => {
        if (grupo.tipo === "markdown") {
          return (
            <div key={indice} className="prose prose-neutral max-w-none dark:prose-invert">
              <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  // eslint-disable-next-line @next/next/no-img-element
                  img: ({ src, alt }) => (
                    <img
                      src={String(src)}
                      alt={alt ?? ""}
                      className="mx-auto h-auto max-h-80 w-full max-w-sm rounded-lg object-contain"
                    />
                  ),
                  a: ({ href, children }) => (
                    <a href={href} rel="nofollow sponsored noopener" target="_blank">
                      {children}
                    </a>
                  ),
                }}
              >
                {grupo.conteudo}
              </Markdown>
            </div>
          );
        }

        if (grupo.tipo === "cta") {
          return (
            <p key={indice} className="not-prose flex justify-center">
              <a
                href={grupo.url}
                rel="nofollow sponsored noopener"
                target="_blank"
                className="inline-flex w-full max-w-md items-center justify-center rounded-lg bg-foreground px-6 py-3 text-center text-sm font-medium text-background"
              >
                {grupo.rotulo}
              </a>
            </p>
          );
        }

        const cards = grupo.slugs.map((slug) => porSlug.get(slug)).filter((p): p is NonNullable<typeof p> => !!p);

        // Produtos removidos ou inativos: o post continua de pé, sem card quebrado.
        if (cards.length === 0) return null;

        if (cards.length === 1) {
          return <CardProdutoDestaque key={indice} produto={cards[0]!} origem={origem} />;
        }

        return (
          <div key={indice} className="not-prose grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cards.map((produto) => (
              <CardProdutoGrade key={produto.slug} produto={produto} origem={origem} />
            ))}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Esta página contém links de afiliado. Se você comprar por eles, o site recebe uma comissão sem custo
        adicional para você.
      </p>
    </div>
  );
}

type GrupoDeBloco =
  | { tipo: "markdown"; conteudo: string }
  | { tipo: "produto"; slugs: string[] }
  | { tipo: "cta"; url: string; rotulo: string };

function agruparProdutosConsecutivos(blocos: ReturnType<typeof separarBlocos>): GrupoDeBloco[] {
  const grupos: GrupoDeBloco[] = [];

  for (const bloco of blocos) {
    if (bloco.tipo === "markdown" || bloco.tipo === "cta") {
      grupos.push(bloco);
      continue;
    }

    const ultimo = grupos.at(-1);
    if (ultimo?.tipo === "produto") {
      ultimo.slugs.push(bloco.slug);
    } else {
      grupos.push({ tipo: "produto", slugs: [bloco.slug] });
    }
  }

  return grupos;
}
