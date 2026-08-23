import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import { prisma } from "@/lib/database";
import { separarBlocos, produtosReferenciados } from "@/lib/conteudo/corpo";

/**
 * Renderiza o corpo do post: markdown normal, com imagens no meio do texto e
 * cards de produto onde houver [produto:slug].
 *
 * Server Component — os produtos vêm do banco em uma consulta só, sem cascata
 * de fetch por card.
 */

interface Props {
  corpo: string;
  /** "blog" — usado no ?o= do /go, para saber de onde veio o clique. */
  origem?: string;
}

export async function CorpoDoPost({ corpo, origem = "blog" }: Props) {
  const blocos = separarBlocos(corpo);
  const slugs = produtosReferenciados(corpo);

  const produtos = slugs.length
    ? await prisma.produto.findMany({ where: { slug: { in: slugs }, ativo: true } })
    : [];

  const porSlug = new Map(produtos.map((produto) => [produto.slug, produto]));

  // Blocos de produto consecutivos (ex: vários [produto:slug] seguidos, sem
  // texto entre eles) viram um grid, pra caber lado a lado em vez de um card
  // largo empilhado por produto.
  const grupos = agruparProdutosConsecutivos(blocos);

  return (
    <div className="flex flex-col gap-8">
      {grupos.map((grupo, indice) => {
        if (grupo.tipo === "markdown") {
          return (
            <div key={indice} className="prose prose-neutral max-w-none dark:prose-invert">
              <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  // eslint-disable-next-line @next/next/no-img-element
                  img: ({ src, alt }) => (
                    <img src={String(src)} alt={alt ?? ""} className="h-auto w-full rounded-lg" />
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

        const cards = grupo.slugs.map((slug) => porSlug.get(slug)).filter((p): p is NonNullable<typeof p> => !!p);

        // Produtos removidos ou inativos: o post continua de pé, sem card quebrado.
        if (cards.length === 0) return null;

        return (
          <div key={indice} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cards.map((produto) => {
              const imagens = (produto.imagens as unknown as string[]) ?? [];

              return (
                <aside
                  key={produto.slug}
                  className="flex flex-col overflow-hidden rounded-xl border border-border"
                >
                  {imagens[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagens[0]}
                      alt={produto.nome}
                      className="aspect-square w-full object-contain p-3"
                    />
                  )}

                  <div className="flex flex-1 flex-col justify-between gap-2 p-3 pt-0">
                    <div>
                      <h3 className="text-sm font-medium leading-snug">{produto.nome}</h3>
                      <p className="text-base font-semibold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          Number(produto.precoAtual),
                        )}
                      </p>
                    </div>

                    <a
                      href={`/go/${produto.codigoCurto}?o=${origem}`}
                      rel="nofollow sponsored noopener"
                      target="_blank"
                      className="rounded-lg bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
                    >
                      Ver oferta
                    </a>
                  </div>
                </aside>
              );
            })}
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

type GrupoDeBloco = { tipo: "markdown"; conteudo: string } | { tipo: "produto"; slugs: string[] };

function agruparProdutosConsecutivos(blocos: ReturnType<typeof separarBlocos>): GrupoDeBloco[] {
  const grupos: GrupoDeBloco[] = [];

  for (const bloco of blocos) {
    if (bloco.tipo === "markdown") {
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
