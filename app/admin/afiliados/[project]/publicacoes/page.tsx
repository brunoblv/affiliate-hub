import Link from "next/link";
import { FileText } from "lucide-react";
import { getProjectBySlug } from "@/lib/projects";
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

export default async function ProjectPublicationsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const contents = await prisma.content.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      campaign: true,
      publications: { orderBy: { createdAt: "desc" }, include: { projectChannel: true } },
    },
  });

  return (
    <div className="space-y-6">
      {contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma publicação criada ainda"
          description="Cadastre o link de afiliado de um produto pendente para gerar a primeira publicação automaticamente."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Canais</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/content/${c.id}`} className="hover:underline">
                    {c.title ?? "(sem título)"}
                  </Link>
                </TableCell>
                <TableCell>{c.product?.name ?? "—"}</TableCell>
                <TableCell className="space-x-1">
                  {c.publications.map((p) => (
                    <Badge key={p.id} variant={STATUS_VARIANT[p.status] ?? "outline"} className="text-xs">
                      {p.projectChannel?.name ?? p.channel} · {p.assisted ? "assistido" : p.status}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
