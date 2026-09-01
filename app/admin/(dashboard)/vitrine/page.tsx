import Link from "next/link";
import { prisma, Destino, StatusLanding } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ConfiguracaoVitrineForm } from "@/components/admin/configuracao-vitrine-form";
import { GerarLandingButton } from "@/components/admin/gerar-landing-button";
import { garantirConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import { DESTINOS, LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { formatarDataCivil } from "@/lib/vitrine/data";

const VARIANTE_STATUS: Record<string, "default" | "secondary" | "destructive"> = {
  PUBLICADA: "default",
  RASCUNHO: "secondary",
  FALHOU: "destructive",
};

export default async function AdminVitrinePage() {
  const configs = await Promise.all(
    DESTINOS.map(async (destino) => ({ destino, config: await garantirConfiguracaoVitrine(destino) })),
  );

  const landings = await prisma.landingDiaria.findMany({
    orderBy: [{ data: "desc" }, { destino: "asc" }],
    take: 30,
    select: {
      id: true,
      slug: true,
      destino: true,
      data: true,
      headline: true,
      status: true,
      textosViaGemini: true,
      _count: { select: { itens: true } },
    },
  });

  return (
    <div className="space-y-10">
      <PageHeader
        title="Vitrine"
        description="Landing diária por destino. Modo Normal continua postando produto a produto; Vitrine gera a página e um post de divulgação."
      />

      {configs.map(({ destino, config }) => (
        <section key={destino} className="max-w-3xl space-y-4 rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{LABEL_DESTINO[destino]}</h2>
              <p className="text-xs text-muted-foreground">
                Destino {destino}
                {config.modo === "VITRINE" ? " — job diário ativo a partir das 6h." : " — só posts individuais."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GerarLandingButton destino={destino} />
            </div>
          </div>
          <ConfiguracaoVitrineForm destino={destino} config={config} />
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Landings recentes</h2>
        {landings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma landing gerada ainda. Ative o modo Vitrine e clique em gerar.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {landings.map((landing) => (
              <li key={landing.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{landing.headline ?? landing.slug}</div>
                  <div className="text-xs text-muted-foreground">
                    {LABEL_DESTINO[landing.destino as Destino]} · {formatarDataCivil(landing.data)} · {landing._count.itens}{" "}
                    itens
                    {landing.textosViaGemini ? " · Gemini" : " · template"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={VARIANTE_STATUS[landing.status] ?? "secondary"}>{landing.status}</Badge>
                  {landing.status === StatusLanding.PUBLICADA && (
                    <Link href={`/vitrine/${landing.slug}`} className="text-sm underline" target="_blank">
                      Ver página
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
