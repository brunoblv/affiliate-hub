import Link from "next/link";
import type { Produto } from "@/lib/database";
import { descontoPercentual, primeiraImagem } from "@/lib/produtos";
import { reais } from "@/lib/vitrine/rotulos";
import { Button } from "@/components/ui/button";

export const LABEL_LOJA: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

export type ProdutoDoCard = Pick<
  Produto,
  "nome" | "imagens" | "precoAtual" | "precoOriginal" | "plataforma" | "codigoCurto"
>;

export function PrecoDoCard({ produto }: { produto: Pick<ProdutoDoCard, "precoAtual" | "precoOriginal"> }) {
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

export function CtaOferta({
  codigoCurto,
  origem,
  tamanho,
}: {
  codigoCurto: string;
  origem: string;
  tamanho: "sm" | "lg";
}) {
  return (
    <Button
      size={tamanho}
      render={
        <a href={`/go/${codigoCurto}?o=${encodeURIComponent(origem)}`} target="_blank" rel="nofollow sponsored noopener" />
      }
      className="w-full"
    >
      Ver oferta
    </Button>
  );
}

/** Card largo de um produto só — foto + preço + CTA. Usado no corpo do post. */
export function CardProdutoDestaque({ produto, origem }: { produto: ProdutoDoCard; origem: string }) {
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

/** Card compacto de grade — vários produtos lado a lado no corpo do post. */
export function CardProdutoGrade({ produto, origem }: { produto: ProdutoDoCard; origem: string }) {
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

/**
 * Capa de post tipo PRODUTO no índice do blog: o próprio card do produto
 * (foto, loja, preço), ligando para o artigo — sem CTA de loja, para não
 * aninhar links.
 */
export function CardProdutoCapa({
  href,
  produto,
  resumo,
  variante = "grade",
}: {
  href: string;
  produto: ProdutoDoCard;
  resumo?: string | null;
  variante?: "grade" | "destaque";
}) {
  const imagem = primeiraImagem(produto);
  const loja = LABEL_LOJA[produto.plataforma] ?? produto.plataforma;

  if (variante === "destaque") {
    return (
      <Link
        href={href}
        className="group grid overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-sage sm:grid-cols-[minmax(0,280px)_1fr]"
      >
        <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)] p-5 sm:aspect-auto sm:min-h-72">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt={produto.nome} className="max-h-72 w-full object-contain" />
          ) : (
            <span className="font-mono text-xs text-muted-foreground">sem imagem</span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-6">
          <span className="text-[10px] font-bold tracking-[0.08em] text-olive">DESTAQUE</span>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{loja}</p>
          <h2 className="font-heading text-[27px] leading-[1.25] font-semibold text-foreground group-hover:underline">
            {produto.nome}
          </h2>
          <PrecoDoCard produto={produto} />
          {resumo && <p className="text-sm leading-relaxed text-muted-foreground">{resumo}</p>}
          <span className="text-sm font-semibold text-primary">Ler ficha →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-sage"
    >
      <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt={produto.nome} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">produto</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{loja}</p>
        <h3 className="line-clamp-2 font-heading text-base font-semibold text-foreground group-hover:underline">
          {produto.nome}
        </h3>
        <PrecoDoCard produto={produto} />
        {resumo && <p className="line-clamp-2 text-sm text-muted-foreground">{resumo}</p>}
      </div>
    </Link>
  );
}
