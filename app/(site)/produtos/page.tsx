import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/database";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Produtos selecionados para o seu lar — compare preços e encontre boas ofertas.",
};

const STORE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
  MAGALU: "Magalu",
  OUTRAS: "Outras lojas",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProdutosPage() {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      project: { type: "HOME", active: true },
    },
    orderBy: [{ discountPercent: "desc" }, { updatedAt: "desc" }],
    take: 60,
  });

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-10 sm:py-16">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">CATÁLOGO</div>
      <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">Produtos</h1>
      <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
        Seleção de itens para casa com links para as lojas. Preços e disponibilidade podem mudar.
      </p>

      {products.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">Nenhum produto publicado ainda.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/produtos/${product.slug}`}
              className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-sage"
            >
              <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3 sm:p-4">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground">produto</span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {STORE_LABEL[product.source] ?? product.source}
                  </span>
                  {product.discountPercent != null && Number(product.discountPercent) > 0 && (
                    <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">
                      -{Number(product.discountPercent).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="mb-1.5 line-clamp-2 text-sm font-semibold text-foreground">{product.name}</div>
                <div className="flex items-baseline gap-2">
                  {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(Number(product.originalPrice))}
                    </span>
                  )}
                  <span className="text-lg font-bold text-foreground">{formatCurrency(Number(product.price))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
