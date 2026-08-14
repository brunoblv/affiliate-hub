import { Send } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaRowActions } from "@/components/admin/fila-row-actions";
import { formatarLocal } from "@/lib/agenda/fuso";

const VARIANTE_STATUS: Record<string, "default" | "secondary" | "destructive"> = {
  PENDENTE: "secondary",
  PUBLICANDO: "secondary",
  PUBLICADA: "default",
  FALHOU: "destructive",
  CANCELADA: "secondary",
};

export default async function FilaAdminPage() {
  const publicacoes = await prisma.publicacao.findMany({
    orderBy: { agendadaPara: "desc" },
    take: 100,
    include: { produto: { select: { nome: true } }, canal: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Fila" description="Publicações agendadas, publicadas e com falha." />

      {publicacoes.length === 0 ? (
        <EmptyState icon={Send} title="Nenhuma publicação agendada" description="Distribua um produto na tela de Produtos para começar." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Agendada para</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publicacoes.map((publicacao) => (
              <TableRow key={publicacao.id}>
                <TableCell className="font-medium">{publicacao.produto.nome}</TableCell>
                <TableCell>{publicacao.canal.nome}</TableCell>
                <TableCell>{formatarLocal(publicacao.agendadaPara)}</TableCell>
                <TableCell>
                  <Badge variant={VARIANTE_STATUS[publicacao.status] ?? "secondary"}>{publicacao.status}</Badge>
                  {publicacao.erro && <p className="mt-1 max-w-xs truncate text-xs text-destructive">{publicacao.erro}</p>}
                </TableCell>
                <TableCell>
                  <FilaRowActions id={publicacao.id} status={publicacao.status} agendadaPara={publicacao.agendadaPara.toISOString()} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
