import { Users, Download } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";

export default async function AssinantesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [assinantes, total] = await Promise.all([
    prisma.assinante.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.assinante.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Assinantes" description="Newsletter — inscritos pela home pública." />
        <Button variant="outline" render={<a href="/api/admin/assinantes/export" />}>
          <Download />
          Exportar CSV
        </Button>
      </div>

      {assinantes.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum assinante ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inscrito em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assinantes.map((assinante) => (
              <TableRow key={assinante.id}>
                <TableCell className="font-medium">{assinante.email}</TableCell>
                <TableCell>
                  <Badge variant={assinante.ativo ? "default" : "secondary"}>{assinante.ativo ? "Ativo" : "Descadastrado"}</Badge>
                </TableCell>
                <TableCell>{assinante.criadoEm.toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/assinantes" />
    </div>
  );
}
