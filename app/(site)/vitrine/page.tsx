import Link from "next/link";
import type { Metadata } from "next";
import { prisma, Destino, StatusLanding } from "@/lib/database";
import { dataCivil, formatarDataCivil } from "@/lib/vitrine/data";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Ofertas do dia",
  description: "A vitrine diária com os destaques e promoções selecionados.",
};

export default async function VitrineIndexPage() {
  const hoje = dataCivil();

  const [hojeLista, arquivo] = await Promise.all([
    prisma.landingDiaria.findMany({
      where: { data: hoje, destino: Destino.MEU_NOVO_LAR, status: StatusLanding.PUBLICADA },
      orderBy: { destino: "asc" },
      select: { slug: true, headline: true, destino: true, data: true, metaDescricao: true },
    }),
    prisma.landingDiaria.findMany({
      where: { destino: Destino.MEU_NOVO_LAR, status: StatusLanding.PUBLICADA, data: { not: hoje } },
      orderBy: { data: "desc" },
      take: 30,
      select: { slug: true, headline: true, destino: true, data: true, metaDescricao: true },
    }),
  ]);

  const destaque = hojeLista.length > 0 ? hojeLista : arquivo.slice(0, 1);
  const arquivoSemDestaque = arquivo.filter((item) => !destaque.some((d) => d.slug === item.slug));

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12 sm:px-10 sm:py-16">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">VITRINE</div>
      <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">Ofertas do dia</h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        Recorte curado do dia — não é o catálogo inteiro. Cada item aponta para o link de afiliado rastreado.
      </p>

      {destaque.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Em breve, a vitrine do dia.</p>
      ) : (
        <ul className="mt-10 space-y-4">
          {destaque.map((landing) => (
            <li key={landing.slug}>
              <Link
                href={`/vitrine/${landing.slug}`}
                className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-sage"
              >
                <div className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                  {LABEL_DESTINO[landing.destino]} · {formatarDataCivil(landing.data)}
                  {hojeLista.length === 0 ? " · última vitrine" : ""}
                </div>
                <div className="mt-1 font-heading text-xl font-semibold text-foreground">
                  {landing.headline ?? "Ofertas do dia"}
                </div>
                {landing.metaDescricao ? (
                  <p className="mt-1 text-sm text-muted-foreground">{landing.metaDescricao}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {arquivoSemDestaque.length > 0 && (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">Arquivo</h2>
          <ul className="mt-4 space-y-2">
            {arquivoSemDestaque.map((item) => (
              <li key={item.slug}>
                <Link href={`/vitrine/${item.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                  {formatarDataCivil(item.data)}
                  {item.destino !== Destino.MEU_NOVO_LAR ? ` · ${LABEL_DESTINO[item.destino]}` : ""}
                  {item.headline ? ` — ${item.headline}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
