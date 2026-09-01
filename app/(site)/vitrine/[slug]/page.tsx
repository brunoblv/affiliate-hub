import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, FaixaPreco, StatusLanding } from "@/lib/database";
import { descontoPercentual, primeiraImagem, LABEL_CATEGORIA } from "@/lib/produtos";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site-url";
import { obterConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import { formatarDataCivil } from "@/lib/vitrine/data";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { linkOfertaVitrine } from "@/lib/vitrine/links";
import { LABEL_SELO, reais, tituloFaixaAcessivel } from "@/lib/vitrine/rotulos";
import { ArquivoLandings, CtaGrupos, LandingProdutoCard } from "@/components/site/landing-vitrine";

export const revalidate = 60;

type ItemComProduto = {
  posicao: number;
  faixaPreco: FaixaPreco;
  selo: "MAIOR_DESCONTO" | "MAIS_VENDIDO" | "ACHADINHO_DO_DIA" | "ULTIMAS_UNIDADES" | null;
  tituloCurto: string | null;
  descricao: string | null;
  produto: {
    id: string;
    nome: string;
    slug: string;
    categoria: keyof typeof LABEL_CATEGORIA;
    imagens: unknown;
    precoAtual: unknown;
    precoOriginal: unknown | null;
    codigoCurto: string;
    linkAfiliado: string;
  };
};

function jsonLd(landing: {
  slug: string;
  headline: string | null;
  metaDescricao: string;
  itens: ItemComProduto[];
}) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: landing.headline ?? "Ofertas do dia",
    description: landing.metaDescricao,
    url: `${siteUrl}/vitrine/${landing.slug}`,
    numberOfItems: landing.itens.length,
    itemListElement: landing.itens.map((item, i) => {
      const imagem = primeiraImagem({ imagens: item.produto.imagens as never });
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: item.tituloCurto || item.produto.nome,
          image: imagem ? [imagem] : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: Number(item.produto.precoAtual),
            availability: "https://schema.org/InStock",
            url: `${siteUrl}/vitrine/${landing.slug}`,
          },
        },
      };
    }),
  };
}

export default async function LandingVitrinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const landing = await prisma.landingDiaria.findUnique({
    where: { slug },
    include: {
      itens: {
        orderBy: { posicao: "asc" },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              slug: true,
              categoria: true,
              imagens: true,
              precoAtual: true,
              precoOriginal: true,
              codigoCurto: true,
              linkAfiliado: true,
            },
          },
        },
      },
    },
  });

  if (!landing || landing.status !== StatusLanding.PUBLICADA) notFound();

  const [config, arquivo] = await Promise.all([
    obterConfiguracaoVitrine(landing.destino),
    prisma.landingDiaria.findMany({
      where: {
        destino: landing.destino,
        status: StatusLanding.PUBLICADA,
        slug: { not: slug },
      },
      orderBy: { data: "desc" },
      take: 14,
      select: { slug: true, headline: true, data: true },
    }),
  ]);

  const heroItem = landing.itens.find((i) => i.produto.id === landing.heroProdutoId) ?? landing.itens[0];
  const resto = landing.itens.filter((i) => i.produto.id !== heroItem?.produto.id);
  const acessiveis = resto.filter((i) => i.faixaPreco === FaixaPreco.ACESSIVEL);
  const ofertas = resto.filter((i) => i.faixaPreco !== FaixaPreco.ACESSIVEL);

  const porCategoria = new Map<string, typeof ofertas>();
  for (const item of ofertas) {
    const chave = item.produto.categoria;
    const lista = porCategoria.get(chave) ?? [];
    lista.push(item);
    porCategoria.set(chave, lista);
  }

  const heroProduto = heroItem?.produto;
  const descontoHero = heroProduto
    ? descontoPercentual({ precoAtual: heroProduto.precoAtual, precoOriginal: heroProduto.precoOriginal })
    : null;
  const imagemHero = heroProduto ? primeiraImagem(heroProduto) : null;
  const ofertaHero = heroProduto ? linkOfertaVitrine(heroProduto, slug) : null;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 pb-24 sm:px-10 sm:py-14">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
        {LABEL_DESTINO[landing.destino].toUpperCase()} · {formatarDataCivil(landing.data)}
      </div>
      <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
        {landing.headline ?? `Ofertas de ${formatarDataCivil(landing.data)}`}
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">{landing.metaDescricao}</p>

      {heroItem && heroProduto && (
        <section className="mt-10 grid grid-cols-1 gap-8 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="relative flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)] p-6 lg:aspect-auto">
            {imagemHero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemHero} alt={heroProduto.nome} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="font-mono text-xs text-muted-foreground">sem imagem</span>
            )}
            {descontoHero !== null && (
              <span className="absolute top-4 left-4 rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">
                -{descontoHero}%
              </span>
            )}
          </div>
          <div className="flex flex-col justify-center p-6 lg:p-8">
            {heroItem.selo && (
              <span className="mb-3 w-fit rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tracking-wide">
                {LABEL_SELO[heroItem.selo]}
              </span>
            )}
            <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              {heroItem.tituloCurto || heroProduto.nome}
            </h2>
            {heroItem.descricao && (
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{heroItem.descricao}</p>
            )}
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-semibold text-foreground">{reais(heroProduto.precoAtual)}</span>
              {heroProduto.precoOriginal && Number(heroProduto.precoOriginal) > Number(heroProduto.precoAtual) && (
                <span className="text-base text-muted-foreground line-through">{reais(heroProduto.precoOriginal)}</span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {ofertaHero ? (
                <Button
                  size="lg"
                  render={<a href={ofertaHero} target="_blank" rel="noopener noreferrer sponsored" />}
                  className="px-6"
                >
                  Ver oferta
                </Button>
              ) : (
                <Button size="lg" disabled className="px-6">
                  Oferta indisponível
                </Button>
              )}
              {config.linkGrupoWhatsapp && (
                <Button
                  size="lg"
                  variant="outline"
                  render={<a href={config.linkGrupoWhatsapp} target="_blank" rel="noopener noreferrer" />}
                  className="px-6"
                >
                  Entrar no grupo de ofertas
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Podemos receber comissão se você comprar pelo link. Isso não muda o preço para você.
            </p>
          </div>
        </section>
      )}

      {acessiveis.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            {tituloFaixaAcessivel(config.tetoAcessivel)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">A faixa de entrada do dia — sempre tem algo nesse preço.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {acessiveis.map((item) => (
              <LandingProdutoCard
                key={item.produto.id}
                produto={item.produto}
                titulo={item.tituloCurto || item.produto.nome}
                descricao={item.descricao}
                selo={item.selo}
                slugLanding={slug}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mt-14">
        <CtaGrupos whatsapp={config.linkGrupoWhatsapp} telegram={config.linkGrupoTelegram} />
      </div>

      {ofertas.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-2xl font-semibold text-foreground">Ofertas do dia</h2>
          {[...porCategoria.entries()].map(([categoria, itens]) => (
            <div key={categoria} className="mt-8">
              <h3 className="mb-4 text-sm font-bold tracking-[0.1em] text-muted-foreground">
                {(LABEL_CATEGORIA[categoria as keyof typeof LABEL_CATEGORIA] ?? categoria).toUpperCase()}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {itens.map((item) => (
                  <LandingProdutoCard
                    key={item.produto.id}
                    produto={item.produto}
                    titulo={item.tituloCurto || item.produto.nome}
                    descricao={item.descricao}
                    selo={item.selo}
                    slugLanding={slug}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-16">
        <ArquivoLandings landings={arquivo} />
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/vitrine" className="underline">
          Todas as vitrines
        </Link>
      </p>

      <CtaGrupos whatsapp={config.linkGrupoWhatsapp} telegram={config.linkGrupoTelegram} variante="barra" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(landing)) }} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const landing = await prisma.landingDiaria.findUnique({
    where: { slug },
    include: {
      heroProduto: { select: { imagens: true } },
    },
  });
  if (!landing || landing.status !== StatusLanding.PUBLICADA) return {};

  const imagem = landing.heroProduto ? primeiraImagem(landing.heroProduto) : null;
  const title = landing.metaTitulo;
  const description = landing.metaDescricao;

  return {
    title,
    description,
    alternates: { canonical: `${getSiteUrl()}/vitrine/${slug}` },
    openGraph: {
      title,
      description,
      images: imagem ? [{ url: imagem }] : undefined,
    },
  };
}
