import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ConversionsPage() {
  const links = await prisma.affiliateLink.findMany({
    where: { conversions: { gt: 0 } },
    orderBy: { conversions: "desc" },
    take: 50,
    include: { product: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Conversões" description="Links de afiliado com conversões registradas" />

      {links.length === 0 ? (
        <EmptyState icon={BarChart3} title="Nenhuma conversão registrada ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Conversões</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.product.name}</TableCell>
                <TableCell>{l.channel}</TableCell>
                <TableCell className="text-right">{l.clicks}</TableCell>
                <TableCell className="text-right">{l.conversions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
