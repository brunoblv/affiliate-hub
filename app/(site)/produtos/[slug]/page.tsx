import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, Destino } from "@/lib/database";
import { descontoPercentual, primeiraImagem, HOME_CATEGORIAS } from "@/lib/produtos";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site-url";

const STORE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const produto = await prisma.produto.findUnique({
    where: { slug },
    include: {
      precos: { orderBy: { registradoEm: "desc" }, take: 8 },
    },
  });

  if (!produto || !produto.ativo || produto.destino !== Destino.MEU_NOVO_LAR || !HOME_CATEGORIAS.includes(produto.categoria)) {
    notFound();
  }

  const store = STORE_LABEL[produto.plataforma] ?? produto.plataforma;
  const preco = Number(produto.precoAtual);
  const original = produto.precoOriginal ? Number(produto.precoOriginal) : null;
  const desconto = descontoPercentual(produto);
  const imagem = primeiraImagem(produto);

  const jsonLd = produto.descricao
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: produto.nome,
        description: produto.descricao,
        image: imagem ? [imagem] : undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: preco,
          availability: "https://schema.org/InStock",
          url: `${getSiteUrl()}/produtos/${produto.slug}`,
        },
      }
    : null;

  return (
    <article className="mx-auto w-full max-w-[1000px] px-5 py-10 sm:px-10 sm:py-14">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="overflow-hidden rounded-2xl bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)]">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt={produto.nome} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center font-mono text-xs text-muted-foreground">
              sem imagem
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">{store.toUpperCase()}</span>
            {desconto !== null && (
              <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
            )}
          </div>

          <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {produto.nome}
          </h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold text-foreground">{formatCurrency(preco)}</span>
            {original != null && original > preco && (
              <span className="text-base text-muted-foreground line-through">{formatCurrency(original)}</span>
            )}
          </div>

          {produto.notaEditorial && (
            <div className="mt-6 rounded-lg border border-sage/40 bg-secondary p-4">
              <div className="mb-1 text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                PARA QUE SERVE
              </div>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{produto.notaEditorial}</p>
            </div>
          )}

          {produto.descricao && (
            <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {produto.descricao}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              render={<a href={`/go/${produto.codigoCurto}?o=blog`} target="_blank" rel="noopener noreferrer sponsored" />}
              className="px-6"
            >
              Ver na loja
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/produtos" />} className="px-6">
              Mais ofertas
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Podemos receber comissão se você comprar pelo link. Isso não muda o preço para você.
          </p>
        </div>
      </div>

      {produto.precos.length > 1 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">Histórico recente de preço</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {produto.precos.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 border-b border-border/60 py-2">
                <span>{entry.registradoEm.toLocaleDateString("pt-BR")}</span>
                <span className="font-medium text-foreground">{formatCurrency(Number(entry.preco))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </article>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const produto = await prisma.produto.findUnique({
    where: { slug },
    select: { nome: true, descricao: true, imagens: true, ativo: true, precoAtual: true, destino: true, categoria: true },
  });
  if (!produto || !produto.ativo || produto.destino !== Destino.MEU_NOVO_LAR || !HOME_CATEGORIAS.includes(produto.categoria)) {
    return {};
  }

  const imagem = primeiraImagem(produto);
  const description =
    produto.descricao?.slice(0, 160) || `Oferta: ${produto.nome} por ${formatCurrency(Number(produto.precoAtual))}.`;

  return {
    title: produto.nome,
    description,
    alternates: { canonical: `${getSiteUrl()}/produtos/${slug}` },
    openGraph: {
      title: produto.nome,
      description,
      images: imagem ? [{ url: imagem }] : undefined,
    },
    // Ficha de produto (preço, imagem, botão de loja) sem conteúdo editorial
    // próprio — não indexar, mesmo padrão aplicado aos posts LISTA/PRODUTO.
    robots: { index: false, follow: true },
  };
}
