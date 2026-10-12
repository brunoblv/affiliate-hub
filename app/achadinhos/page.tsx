import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShowcaseCard, ShowcaseGrid } from "@/components/showcase-card";
import { listTierCards } from "@/lib/showcase/read";
import { SHOWCASE_MIN_VISIBLE } from "@/lib/showcase/select";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achadinhos bem avaliados",
  description: "Produtos sem marca com nota alta e boa saída nas lojas que monitoramos, com a fonte e a data de cada número.",
};

/** Genéricos só aparecem com nota da loja de 4,6+ e métrica recente: sem número, sem "bem avaliado". */
const MIN_RATING_CENTIS = 460;

export default async function BargainsPage() {
  const cards = await listTierCards("GENERIC", { minRatingCentis: MIN_RATING_CENTIS });
  const visible = cards.length >= SHOWCASE_MIN_VISIBLE;

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-8">
        <h1 className="text-[34px] font-extrabold tracking-[-0.035em]">Achadinhos bem avaliados</h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-muted">
          Produtos sem marca conhecida, com nota 4,6 ou mais na própria loja. Sem marca não quer dizer sem qualidade, mas vale
          ler as avaliações antes de comprar. Procurando marca?{" "}
          <Link href="/marcas" className="underline hover:text-brand">
            Veja as marcas conhecidas
          </Link>
          .
        </p>

        {visible ? (
          <ShowcaseGrid>
            {cards.map(({ deal, storeName }) => (
              <ShowcaseCard key={deal.item.offerId} deal={deal} storeName={storeName} />
            ))}
          </ShowcaseGrid>
        ) : (
          <p className="mt-7 rounded-[14px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            Ainda não há achadinhos com nota e vendas recentes suficientes para listar.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
