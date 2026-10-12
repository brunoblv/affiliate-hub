import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { integer } from "@/lib/format";
import { listStoreIndex } from "@/lib/showcase/read";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lojas",
  description: "As lojas que monitoramos e o que há de melhor em cada uma, com preço, histórico e comparação.",
};

export default async function StoresPage() {
  const stores = await listStoreIndex();

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-8">
        <h1 className="text-[34px] font-extrabold tracking-[-0.035em]">Lojas</h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-muted">
          Cada loja tem a sua vitrine: achados do dia, mais vendidos e melhores ofertas, sempre com a fonte do número e a data
          da coleta.
        </p>

        {stores.length === 0 ? (
          <p className="mt-7 rounded-[14px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            Ainda não há lojas com ofertas atuais.
          </p>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.slug}
                href={`/loja/${store.slug}`}
                className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-brand"
              >
                <span className="text-lg font-bold">{store.name}</span>
                {store.tagline ? <span className="text-[13px] text-muted">{store.tagline}</span> : null}
                <span className="mt-1 text-xs font-semibold text-brand">
                  {integer(store.productCount)} {store.productCount === 1 ? "produto" : "produtos"} com oferta atual →
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
