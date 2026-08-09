import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  PUBLISHED: "default",
};

export default async function ContentPage() {
  const contents = await prisma.content.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Conteúdo" description="Textos e peças geradas para divulgação dos produtos" />

      {contents.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum conteúdo gerado ainda" description="Gere conteúdo a partir de uma oportunidade ou produto." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/content/${c.id}`} className="hover:underline">
                    {c.title ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>{c.product?.name ?? "—"}</TableCell>
                <TableCell>{c.type.replaceAll("_", " ")}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status]}>{c.status.replaceAll("_", " ")}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
