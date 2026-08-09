import { ScrollText } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const LEVEL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DEBUG: "outline",
  INFO: "secondary",
  WARN: "default",
  ERROR: "destructive",
};

export default async function LogsPage() {
  const logs = await prisma.log.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="space-y-6">
      <PageHeader title="Logs" description="Sincronizações, APIs, publicações, falhas e webhooks" />

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum log registrado ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {log.createdAt.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{log.scope}</TableCell>
                <TableCell>
                  <Badge variant={LEVEL_VARIANT[log.level]}>{log.level}</Badge>
                </TableCell>
                <TableCell>{log.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
