import Link from "next/link";
import type { Metadata } from "next";
import { prisma, Destino } from "@/lib/database";
import { descontoPercentual, primeiraImagem, HOME_CATEGORIAS, produtoVisivelNoSite, deduplicarCatalogo } from "@/lib/produtos";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Ofertas e descontos selecionados para o seu lar.",
};

const STORE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function OfertasPage() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, destino: Destino.MEU_NOVO_LAR, categoria: { in: HOME_CATEGORIAS } },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  const ofertas = deduplicarCatalogo(produtos.filter(produtoVisivelNoSite))
    .map((produto) => ({ produto, desconto: descontoPercentual(produto) }))
    .filter((item): item is { produto: (typeof produtos)[number]; desconto: number } => item.desconto !== null && item.desconto > 0)
    .sort((a, b) => b.desconto - a.desconto)
    .slice(0, 60);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-10 sm:py-16">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">PROMOÇÕES</div>
      <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">Ofertas</h1>
      <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
        Produtos com desconto que encontramos agora. Valores podem mudar a qualquer momento.
      </p>

      {ofertas.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">
          Nenhuma oferta no momento. Veja todos os{" "}
          <Link href="/produtos" className="underline">
            produtos
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ofertas.map(({ produto, desconto }) => {
            const imagem = primeiraImagem(produto);
            return (
              <Link
                key={produto.id}
                href={`/produtos/${produto.slug}`}
                className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-sage"
              >
                <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3 sm:p-4">
                  {imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagem} alt={produto.nome} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">produto</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {STORE_LABEL[produto.plataforma] ?? produto.plataforma}
                    </span>
                    <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
                  </div>
                  <div className="mb-1.5 line-clamp-2 text-sm font-semibold text-foreground">{produto.nome}</div>
                  <div className="flex items-baseline gap-2">
                    {produto.precoOriginal && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(Number(produto.precoOriginal))}
                      </span>
                    )}
                    <span className="text-lg font-bold text-foreground">{formatCurrency(Number(produto.precoAtual))}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
