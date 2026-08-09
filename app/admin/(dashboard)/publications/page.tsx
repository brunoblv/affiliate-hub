import { Send } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  QUEUED: "secondary",
  PUBLISHING: "secondary",
  PUBLISHED: "default",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export default async function PublicationsPage() {
  const publications = await prisma.publication.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { content: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Publicações" description="Publicações programadas ou realizadas nos canais" />

      {publications.length === 0 ? (
        <EmptyState icon={Send} title="Nenhuma publicação registrada ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Agendado para</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.content.title ?? "—"}</TableCell>
                <TableCell>{p.channel}</TableCell>
                <TableCell>{p.scheduledAt ? p.scheduledAt.toLocaleString("pt-BR") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
