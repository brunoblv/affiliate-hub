import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import { prisma, type Produto } from "@/lib/database";
import { separarBlocos, produtosReferenciados } from "@/lib/conteudo/corpo";
import { descontoPercentual, primeiraImagem, produtoVisivelNoSite } from "@/lib/produtos";
import { reais } from "@/lib/vitrine/rotulos";
import { Button } from "@/components/ui/button";

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

const LABEL_LOJA: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

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

function CtaOferta({ codigoCurto, origem, tamanho }: { codigoCurto: string; origem: string; tamanho: "sm" | "lg" }) {
  return (
    <Button
      size={tamanho}
      render={<a href={`/go/${codigoCurto}?o=${encodeURIComponent(origem)}`} target="_blank" rel="nofollow sponsored noopener" />}
      className="w-full"
    >
      Ver oferta
    </Button>
  );
}

function PrecoDoCard({ produto }: { produto: Produto }) {
  const desconto = descontoPercentual(produto);
  const original = produto.precoOriginal != null ? Number(produto.precoOriginal) : null;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {original != null && original > Number(produto.precoAtual) && (
        <span className="text-sm text-muted-foreground line-through">{reais(original)}</span>
      )}
      <span className="text-lg font-semibold text-foreground">{reais(produto.precoAtual)}</span>
      {desconto !== null && (
        <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
      )}
    </div>
  );
}

function CardProdutoDestaque({ produto, origem }: { produto: Produto; origem: string }) {
  const imagem = primeiraImagem(produto);
  const loja = LABEL_LOJA[produto.plataforma] ?? produto.plataforma;

  return (
    <aside className="not-prose overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)] p-4 sm:aspect-auto sm:min-h-55">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt={produto.nome} className="max-h-64 w-full object-contain sm:max-h-56" />
          ) : (
            <span className="font-mono text-xs text-muted-foreground">sem imagem</span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-5">
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{loja}</p>
          <h3 className="font-heading text-lg font-semibold leading-snug text-foreground">{produto.nome}</h3>
          <PrecoDoCard produto={produto} />
          <div className="pt-1">
            <CtaOferta codigoCurto={produto.codigoCurto} origem={origem} tamanho="lg" />
          </div>
          <p className="text-xs text-muted-foreground">Preço e disponibilidade podem mudar na loja.</p>
        </div>
      </div>
    </aside>
  );
}

function CardProdutoGrade({ produto, origem }: { produto: Produto; origem: string }) {
  const imagem = primeiraImagem(produto);

  return (
    <aside className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt={produto.nome} className="aspect-square w-full object-contain p-3" />
      )}
      <div className="flex flex-1 flex-col justify-between gap-2 p-3 pt-0">
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium leading-snug">{produto.nome}</h3>
          <PrecoDoCard produto={produto} />
        </div>
        <CtaOferta codigoCurto={produto.codigoCurto} origem={origem} tamanho="sm" />
      </div>
    </aside>
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
