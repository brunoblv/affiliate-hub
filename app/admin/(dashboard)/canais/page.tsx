import Link from "next/link";
import { Radio, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { rotuloJanela } from "@/lib/agenda/janela";
import { etiquetaDoCanal } from "@/lib/shopee/etiquetas";

const LABEL_DESTINO: Record<string, string> = {
  MEU_NOVO_LAR: "Meu Novo Lar",
  TIKTOK_SHOP: "TikTok Shop",
  UMBANDA: "Umbanda",
};

export default async function CanaisAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [canais, total] = await Promise.all([
    prisma.canal.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.canal.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
              <TableHead>Etiqueta Shopee</TableHead>
              <TableHead>Rede</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Agenda</TableHead>
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
                <TableCell className="font-mono text-xs">{etiquetaDoCanal(canal)}</TableCell>
                <TableCell>{canal.rede}</TableCell>
                <TableCell>{LABEL_DESTINO[canal.destino] ?? canal.destino}</TableCell>
                <TableCell>{rotuloJanela(canal.intervaloMinimoMin)}</TableCell>
                <TableCell>
                  <Badge variant={canal.ativo ? "default" : "secondary"}>{canal.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/canais" />
    </div>
  );
}
