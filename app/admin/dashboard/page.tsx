import { prisma } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function getDashboardData() {
  const [clicks, conversions, commissionAgg, topProducts, channelClicks] = await Promise.all([
    prisma.click.count(),
    prisma.affiliateLink.aggregate({ _sum: { conversions: true } }),
    prisma.affiliateLink.aggregate({ _sum: { commission: true } }),
    prisma.productScore.findMany({
      orderBy: { totalScore: "desc" },
      take: 5,
      distinct: ["productId"],
      include: { product: true },
    }),
    prisma.affiliateLink.groupBy({ by: ["channel"], _sum: { clicks: true } }),
  ]);

  return {
    clicks,
    conversions: conversions._sum.conversions ?? 0,
    commission: Number(commissionAgg._sum.commission ?? 0),
    topProducts,
    channelClicks,
  };
}

export default async function DashboardPage() {
  const { clicks, conversions, commission, topProducts, channelClicks } = await getDashboardData();

  const maxChannelClicks = Math.max(1, ...channelClicks.map((c) => c._sum.clicks ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral de desempenho do sistema de afiliados</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cliques</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{clicks.toLocaleString("pt-BR")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversões</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{conversions.toLocaleString("pt-BR")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissão</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{formatCurrency(commission)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance dos canais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelClicks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
            )}
            {channelClicks.map((c) => {
              const value = c._sum.clicks ?? 0;
              const pct = Math.round((value / maxChannelClicks) * 100);
              return (
                <div key={c.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.channel}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Melhores produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto pontuado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.product.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{Number(s.totalScore).toFixed(0)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
