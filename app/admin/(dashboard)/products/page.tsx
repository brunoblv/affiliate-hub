import Link from "next/link";
import { Package, Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { category: true, scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Produtos" description="Produtos importados das plataformas de afiliados" />
        <div className="flex gap-2">
          <Link href="/admin/products/import" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Upload />
            Importar CSV
          </Link>
          <Link href="/admin/products/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            Novo produto
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto importado ainda"
          description="Conecte a Shopee ou o TikTok Shop em Integrações e rode a sincronização, ou cadastre um produto manualmente."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.source}</TableCell>
                <TableCell>{p.category?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(p.price))}</TableCell>
                <TableCell className="text-right">{p.discountPercent ? `${p.discountPercent}%` : "—"}</TableCell>
                <TableCell className="text-right">
                  {p.scores[0] ? (
                    <Badge variant="secondary">{Number(p.scores[0].totalScore).toFixed(0)}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
