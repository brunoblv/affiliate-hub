import { MousePointerClick } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClicksPage() {
  const clicks = await prisma.click.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { affiliateLink: { include: { product: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cliques" description="Últimos cliques registrados no tracking próprio" />

      {clicks.length === 0 ? (
        <EmptyState icon={MousePointerClick} title="Nenhum clique registrado ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clicks.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.affiliateLink.product.name}</TableCell>
                <TableCell>{c.affiliateLink.channel}</TableCell>
                <TableCell>{c.createdAt.toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
