import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShowcaseCard, ShowcaseGrid } from "@/components/showcase-card";
import { integer } from "@/lib/format";
import { MIN_INDEXABLE_PRODUCTS, getStoreShowcase, type ShowcaseCard as Card } from "@/lib/showcase/read";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const stamp = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const showcase = await getStoreShowcase(slug);
  if (!showcase) return { title: "Loja não encontrada", robots: { index: false } };
  const { store } = showcase;
  return {
    title: `${store.name}: achados, mais vendidos e melhores ofertas`,
    description: store.tagline ?? `O que há de melhor na ${store.name} hoje: preço, histórico de 30 dias e comparação com outras lojas.`,
    alternates: { canonical: `/loja/${store.slug}` },
    // Vitrine rasa não deve ser indexada.
    robots: showcase.productCount >= MIN_INDEXABLE_PRODUCTS ? undefined : { index: false, follow: true },
  };
}

function Section({ title, hint, cards, storeName }: { title: string; hint?: string; cards: Card[]; storeName: string }) {
  return (
    <section className="mt-12" aria-labelledby={`sec-${title}`}>
      <h2 id={`sec-${title}`} className="text-2xl font-extrabold tracking-[-0.03em]">
        {title}
      </h2>
      {hint ? <p className="mt-1 text-[13px] text-muted">{hint}</p> : null}
      <ShowcaseGrid>
        {cards.map(({ deal, reason }) => (
          <ShowcaseCard key={deal.item.offerId} deal={deal} reason={reason || undefined} storeName={storeName} />
        ))}
      </ShowcaseGrid>
    </section>
  );
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const showcase = await getStoreShowcase(slug);
  if (!showcase) notFound();
  const { store, sections, branded, generic, productCount } = showcase;

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-8">
        <nav aria-label="Trilha" className="text-xs text-muted">
          <Link href="/loja" className="hover:text-brand">
            Lojas
          </Link>{" "}
          / {store.name}
        </nav>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.035em]">{store.name}</h1>
        {store.tagline ? <p className="mt-2 text-[15px] text-muted">{store.tagline}</p> : null}
        <p className="mt-2 text-[13px] text-muted">
          {integer(productCount)} {productCount === 1 ? "produto" : "produtos"} com oferta atual monitorada.
        </p>
        {store.about ? <p className="mt-4 max-w-3xl whitespace-pre-line text-[14px] leading-relaxed">{store.about}</p> : null}

        {sections.length === 0 && branded.length === 0 && generic.length === 0 ? (
          <p className="mt-10 rounded-[14px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            Ainda estamos reunindo histórico de preço desta loja para montar a vitrine. Volte em alguns dias ou veja as{" "}
            <Link href="/ofertas" className="underline hover:text-brand">
              ofertas gerais
            </Link>
            .
          </p>
        ) : null}

        {sections.map((section) => (
          <Section
            key={section.kind}
            title={section.title}
            hint={
              section.kind === "ACHADOS" && section.builtAt
                ? `Selecionados hoje às ${stamp(section.builtAt)}. Cada card diz o motivo da escolha.`
                : section.kind === "MELHORES_OFERTAS"
                  ? "Preço atual contra o histórico observado de 30 dias (mínimo de sete dias de coleta)."
                  : undefined
            }
            cards={section.cards}
            storeName={store.name}
          />
        ))}

        {branded.length > 0 ? (
          <Section title="Marcas conhecidas" hint="Produtos de marca, com os que mais vendem primeiro." cards={branded} storeName={store.name} />
        ) : null}
        {generic.length > 0 ? (
          <Section
            title="Achadinhos sem marca"
            hint="Produtos genéricos com boa saída. Sem marca não significa sem qualidade, mas vale ler as avaliações na loja."
            cards={generic}
            storeName={store.name}
          />
        ) : null}

        <p className="mt-14 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          Vendas e notas são informadas pela própria loja e aparecem com a data da coleta. Ganhamos comissão sobre compras feitas
          pelos links desta página, sem custo extra para você e sem alterar a ordem por preço.{" "}
          <Link href="/afiliados" className="underline hover:text-brand">
            Como funciona
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
