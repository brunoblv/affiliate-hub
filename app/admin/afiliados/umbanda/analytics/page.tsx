import { MousePointerClick } from "lucide-react";
import { getUmbandaProject } from "@/lib/projects";
import { prisma } from "@/lib/database";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function UmbandaAnalyticsPage() {
  const project = await getUmbandaProject();

  const links = await prisma.affiliateLink.findMany({
    where: { product: { projectId: project.id } },
    include: { product: { include: { category: true } } },
    orderBy: { clicks: "desc" },
    take: 20,
  });

  const categoryClicks = new Map<string, number>();
  for (const link of links) {
    const name = link.product.category?.name ?? "Sem categoria";
    categoryClicks.set(name, (categoryClicks.get(name) ?? 0) + link.clicks);
  }
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔥 Produtos mais clicados</CardTitle>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <EmptyState icon={MousePointerClick} title="Nenhum clique registrado ainda" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.product.name}</TableCell>
                      <TableCell className="text-right">{l.clicks}</TableCell>
                      <TableCell className="text-right">{l.conversions}</TableCell>
                      <TableCell className="text-right">
                        {Number(l.commission).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliques por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...categoryClicks.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, clicks]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{Math.round((clicks / totalClicks) * 100)}%</span>
                </div>
              ))}
            {categoryClicks.size === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
