import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { getUmbandaProject } from "@/lib/projects";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function UmbandaProductsPage() {
  const project = await getUmbandaProject();

  const products = await prisma.product.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { category: true, sources: true, scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Produtos e ofertas do projeto Umbanda.</p>
        <Link href={`/admin/products/new?projectId=${project.id}`} className={cn(buttonVariants({ size: "sm" }))}>
          <Plus />
          Novo produto
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado ainda"
          description="Cadastre velas, defumação, artigos religiosos, guias, vestuário, livros, oráculos ou decoração."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Fontes</TableHead>
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
                <TableCell>{p.category?.name ?? "—"}</TableCell>
                <TableCell>{p.source}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(p.price))}</TableCell>
                <TableCell className="text-right">{p.sources.length}</TableCell>
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
