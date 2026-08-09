import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AnalyticsPage() {
  const byPlatform = await prisma.affiliateLink.groupBy({
    by: ["platform"],
    _sum: { clicks: true, conversions: true, commission: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Desempenho consolidado por plataforma, canal, campanha e produto" />

      {byPlatform.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dado de analytics disponível ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byPlatform.map((p) => (
            <Card key={p.platform}>
              <CardHeader>
                <CardTitle className="text-base">{p.platform}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Cliques: {p._sum.clicks ?? 0}</p>
                <p>Conversões: {p._sum.conversions ?? 0}</p>
                <p>Comissão: {formatCurrency(Number(p._sum.commission ?? 0))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
