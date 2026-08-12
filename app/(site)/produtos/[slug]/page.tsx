import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/database";
import { getSiteUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/button";

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

function resolveCtaUrl(product: {
  productUrl: string | null;
  affiliateLinks: Array<{ shortCode: string }>;
  sources: Array<{ affiliateUrl: string | null; externalUrl: string | null }>;
}) {
  const tracked = product.affiliateLinks[0];
  if (tracked) return `${getSiteUrl()}/go/${tracked.shortCode}`;

  const source = product.sources[0];
  return source?.affiliateUrl || source?.externalUrl || product.productUrl || null;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      affiliateLinks: { orderBy: { createdAt: "desc" }, take: 1 },
      sources: { orderBy: { updatedAt: "desc" }, take: 1 },
      priceHistory: { orderBy: { recordedAt: "desc" }, take: 8 },
    },
  });

  if (!product || product.status !== "ACTIVE") notFound();

  const ctaUrl = resolveCtaUrl(product);
  const store = STORE_LABEL[product.source] ?? product.source;
  const price = Number(product.price);
  const original = product.originalPrice ? Number(product.originalPrice) : null;
  const discount =
    product.discountPercent != null
      ? Number(product.discountPercent)
      : original && original > price
        ? Math.round(((original - price) / original) * 100)
        : null;

  return (
    <article className="mx-auto w-full max-w-[1000px] px-5 py-10 sm:px-10 sm:py-14">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="overflow-hidden rounded-2xl bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)]">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center font-mono text-xs text-muted-foreground">
              sem imagem
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">{store.toUpperCase()}</span>
            {product.category && (
              <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {product.category.name}
              </span>
            )}
            {discount != null && discount > 0 && (
              <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">
                -{discount.toFixed(0)}%
              </span>
            )}
          </div>

          <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold text-foreground">{formatCurrency(price)}</span>
            {original != null && original > price && (
              <span className="text-base text-muted-foreground line-through">{formatCurrency(original)}</span>
            )}
          </div>

          {product.description && (
            <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {ctaUrl ? (
              <Button size="lg" render={<a href={ctaUrl} target="_blank" rel="noopener noreferrer sponsored" />} className="px-6">
                Ver na loja
              </Button>
            ) : (
              <Button size="lg" disabled className="px-6">
                Link indisponível
              </Button>
            )}
            <Button size="lg" variant="outline" render={<Link href="/#ofertas" />} className="px-6">
              Mais ofertas
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Podemos receber comissão se você comprar pelo link. Isso não muda o preço para você.
          </p>
        </div>
      </div>

      {product.priceHistory.length > 1 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">Histórico recente de preço</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {product.priceHistory.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 border-b border-border/60 py-2">
                <span>{entry.recordedAt.toLocaleDateString("pt-BR")}</span>
                <span className="font-medium text-foreground">{formatCurrency(Number(entry.price))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, description: true, imageUrl: true, status: true, price: true },
  });
  if (!product || product.status !== "ACTIVE") return {};

  const description =
    product.description?.slice(0, 160) ||
    `Oferta: ${product.name} por ${formatCurrency(Number(product.price))}.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}
