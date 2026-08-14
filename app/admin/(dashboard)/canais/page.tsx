import Link from "next/link";
import { Radio, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CanaisAdminPage() {
  const canais = await prisma.canal.findMany({ orderBy: { criadoEm: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Canais" description="Onde e quando os produtos são distribuídos." />
        <Button render={<Link href="/admin/canais/novo" />}>
          <Plus />
          Novo canal
        </Button>
      </div>

      {canais.length === 0 ? (
        <EmptyState icon={Radio} title="Nenhum canal cadastrado" description="Cadastre o primeiro canal pelo botão acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Rede</TableHead>
              <TableHead>Horários</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {canais.map((canal) => (
              <TableRow key={canal.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/canais/${canal.id}`} className="hover:underline">
                    {canal.nome}
                  </Link>
                </TableCell>
                <TableCell>{canal.rede}</TableCell>
                <TableCell>{((canal.horarios as unknown as string[]) ?? []).join(", ") || "—"}</TableCell>
                <TableCell>
                  <Badge variant={canal.ativo ? "default" : "secondary"}>{canal.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
