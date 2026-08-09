import Link from "next/link";
import { FileText } from "lucide-react";
import { getUmbandaProject } from "@/lib/projects";
import { prisma } from "@/lib/database";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "secondary",
  APPROVED: "secondary",
  REJECTED: "destructive",
  PUBLISHED: "default",
};

export default async function UmbandaPublicationsPage() {
  const project = await getUmbandaProject();

  const contents = await prisma.content.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { product: true, campaign: true, publications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      {contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma publicação criada ainda"
          description="Gere conteúdo a partir de um produto em Produtos e ofertas."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Agendado para</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.map((c) => {
              const publication = c.publications[0];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/content/${c.id}`} className="hover:underline">
                      {c.title ?? "(sem título)"}
                    </Link>
                  </TableCell>
                  <TableCell>{c.product?.name ?? "—"}</TableCell>
                  <TableCell>{c.campaign?.name ?? "—"}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{publication?.scheduledAt ? publication.scheduledAt.toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
