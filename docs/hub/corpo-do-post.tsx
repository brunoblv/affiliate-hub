import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { prisma } from "@/lib/database";
import { separarBlocos, produtosReferenciados } from "@/lib/conteudo/corpo";

/**
 * Renderiza o corpo do post: markdown normal, com imagens no meio do texto e
 * cards de produto onde houver [produto:slug].
 *
 * Server Component — os produtos vêm do banco em uma consulta só, sem cascata
 * de fetch por card.
 *
 * Requer: npm i react-markdown remark-gfm
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

  return (
    <div className="flex flex-col gap-8">
      {blocos.map((bloco, indice) => {
        if (bloco.tipo === "markdown") {
          return (
            <div key={indice} className="prose prose-neutral max-w-none dark:prose-invert">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt }) => (
                    <Image
                      src={String(src)}
                      alt={alt ?? ""}
                      width={1200}
                      height={800}
                      sizes="(max-width: 768px) 100vw, 720px"
                      className="h-auto w-full rounded-lg"
                    />
                  ),
                  a: ({ href, children }) => (
                    <a href={href} rel="nofollow sponsored noopener" target="_blank">
                      {children}
                    </a>
                  ),
                }}
              >
                {bloco.conteudo}
              </Markdown>
            </div>
          );
        }

        const produto = porSlug.get(bloco.slug);

        // Produto removido ou inativo: o post continua de pé, sem card quebrado.
        if (!produto) return null;

        const imagens = (produto.imagens as unknown as string[]) ?? [];

        return (
          <aside key={indice} className="flex gap-4 rounded-xl border p-4">
            {imagens[0] && (
              <Image
                src={imagens[0]}
                alt={produto.nome}
                width={160}
                height={160}
                className="size-32 shrink-0 rounded-lg object-contain"
              />
            )}

            <div className="flex flex-col justify-between gap-2">
              <div>
                <h3 className="font-medium leading-snug">{produto.nome}</h3>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    Number(produto.precoAtual),
                  )}
                </p>
              </div>

              <a
                href={`/go/${produto.codigoCurto}?o=${origem}`}
                rel="nofollow sponsored noopener"
                target="_blank"
                className="w-fit rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Ver oferta
              </a>
            </div>
          </aside>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Esta página contém links de afiliado. Se você comprar por eles, o site recebe uma comissão sem custo
        adicional para você.
      </p>
    </div>
  );
}
