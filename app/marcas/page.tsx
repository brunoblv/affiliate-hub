import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShowcaseCard, ShowcaseGrid } from "@/components/showcase-card";
import { listTierCards } from "@/lib/showcase/read";
import { SHOWCASE_MIN_VISIBLE } from "@/lib/showcase/select";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marcas conhecidas",
  description: "Produtos de marca conhecida nas lojas que monitoramos, com preço, histórico e comparação entre lojas.",
};

export default async function BrandsPage() {
  const cards = await listTierCards("BRANDED");
  const visible = cards.length >= SHOWCASE_MIN_VISIBLE;

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-8">
        <h1 className="text-[34px] font-extrabold tracking-[-0.035em]">Marcas conhecidas</h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-muted">
          Produtos de marca reconhecida em cada loja, com os que mais vendem primeiro. Procurando um bom custo-benefício sem marca?{" "}
          <Link href="/achadinhos" className="underline hover:text-brand">
            Veja os achadinhos
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
            Ainda não há produtos de marca suficientes com oferta atual.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
