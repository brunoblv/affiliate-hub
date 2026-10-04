import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatGuideDate, guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guias de compra",
  description: "Guias para comparar preços, entender o histórico, avaliar promoções e comprar melhor em marketplaces.",
  alternates: { canonical: "/guias" },
};

export default function GuidesPage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[960px] px-4 pb-24 pt-10 sm:px-8">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">Guias de compra</h1>
        <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-muted">
          Como usar o histórico, avaliar promoções e comparar ofertas antes de comprar.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="flex h-full flex-col gap-2 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-brand"
              >
                <h2 className="text-lg font-bold tracking-[-0.02em]">{guide.title}</h2>
                <p className="text-sm leading-relaxed text-muted">{guide.description}</p>
                <span className="mt-auto pt-2 text-xs text-faint">
                  {guide.readingMinutes} min de leitura · atualizado em {formatGuideDate(guide.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
