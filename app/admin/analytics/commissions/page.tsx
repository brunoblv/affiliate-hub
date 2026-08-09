import { Wallet } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CommissionsPage() {
  const links = await prisma.affiliateLink.findMany({
    where: { commission: { gt: 0 } },
    orderBy: { commission: "desc" },
    take: 50,
    include: { product: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Comissões" description="Comissão acumulada por link de afiliado" />

      {links.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma comissão registrada ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.product.name}</TableCell>
                <TableCell>{l.channel}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(l.commission))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
