import Link from "next/link";
import { Package, Plus, Link2 } from "lucide-react";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { setAffiliateLinkAction } from "./actions";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProjectProductsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const [pending, products] = await Promise.all([
    prisma.productSource.findMany({
      where: { affiliateUrl: null, product: { projectId: project.id } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.product.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: { category: true, sources: true, affiliateLinks: true, scores: { orderBy: { calculatedAt: "desc" }, take: 1 } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Produtos e ofertas do projeto {project.name}.</p>
        <Link href={`/admin/products/new?projectId=${project.id}`} className={cn(buttonVariants({ size: "sm" }))}>
          <Plus />
          Novo produto manual
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4" />
            Pendentes de link de afiliado ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto descoberto aguardando link. A descoberta diária roda automaticamente e traz novos produtos
              aqui.
            </p>
          ) : (
            pending.map((source) => {
              const setLinkWithIds = setAffiliateLinkAction.bind(null, source.productId, source.id);
              return (
                <div key={source.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  {source.product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={source.product.imageUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{source.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.platform} · {formatCurrency(Number(source.product.price))}
                      {source.externalUrl && (
                        <>
                          {" · "}
                          <a href={source.externalUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            ver anúncio
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <form action={setLinkWithIds} className="flex shrink-0 gap-2">
                    <Input name="affiliateUrl" type="url" placeholder="Cole o link de afiliado" required className="w-64" />
                    <Button type="submit" size="sm">
                      Salvar e publicar
                    </Button>
                  </form>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto cadastrado ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Link</TableHead>
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
                <TableCell>
                  {p.affiliateLinks.length > 0 ? (
                    <Badge variant="default">cadastrado</Badge>
                  ) : (
                    <Badge variant="outline">pendente</Badge>
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
