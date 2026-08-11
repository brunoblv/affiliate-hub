import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { isScrapedProductIncomplete } from "@/lib/scrape";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { activateScrapedProductAction, updateScrapedProductAction } from "./actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RevisarProdutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ imported?: string; created?: string; captured?: string }>;
}) {
  const { project: slug } = await params;
  const query = await searchParams;
  const project = await getProjectBySlug(slug);

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { projectId: project.id },
      include: {
        category: true,
        sources: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.category.findMany({
      where: { projectId: project.id, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const toReview = products.filter(
    (p) =>
      p.status === "INACTIVE" ||
      isScrapedProductIncomplete({
        name: p.name,
        price: Number(p.price),
        imageUrl: p.imageUrl,
        description: p.description,
        categoryId: p.categoryId,
      }),
  );

  return (
    <div className="space-y-6">
      {query.imported && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          {query.imported} link(s) importado(s) como rascunho
          {query.created ? ` (${query.created} novo(s))` : ""}. Complete os dados abaixo ou use o bookmarklet em
          Capturar.
        </p>
      )}
      {query.captured === "1" && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          Produto capturado salvo. Revise se precisar e ative.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Complete nome, preço, imagem, categoria e link de afiliado. Produtos importados por scrape começam
          inativos.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/afiliados/${slug}/capturar`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Capturar / bookmarklet
          </Link>
          <Link
            href={`/admin/afiliados/${slug}/importar-links`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Importar mais links
          </Link>
        </div>
      </div>

      {toReview.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nada pendente de revisão"
          description="Quando o scrape gravar produtos incompletos ou inativos, eles aparecem aqui."
        />
      ) : (
        toReview.map((product) => {
          const source = product.sources[0];
          const update = updateScrapedProductAction.bind(null, slug, product.id);
          const activate = activateScrapedProductAction.bind(null, slug, product.id);
          const incomplete = isScrapedProductIncomplete({
            name: product.name,
            price: Number(product.price),
            imageUrl: product.imageUrl,
            description: product.description,
            categoryId: product.categoryId,
          });

          return (
            <Card key={product.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div className="flex min-w-0 items-start gap-3">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" className="size-16 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      sem img
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">{product.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {product.source} · {formatCurrency(Number(product.price))}
                      {product.productUrl && (
                        <>
                          {" · "}
                          <a href={product.productUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            abrir link
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>{product.status}</Badge>
                  {incomplete && <Badge variant="outline">incompleto</Badge>}
                  <Link href={`/admin/products/${product.id}`} className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}>
                    Ficha completa
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <form action={update} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`name-${product.id}`}>Nome</Label>
                    <Input id={`name-${product.id}`} name="name" defaultValue={product.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`price-${product.id}`}>Preço</Label>
                    <Input
                      id={`price-${product.id}`}
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(product.price)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`originalPrice-${product.id}`}>Preço original</Label>
                    <Input
                      id={`originalPrice-${product.id}`}
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product.originalPrice ? Number(product.originalPrice) : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`categoryId-${product.id}`}>Categoria</Label>
                    <select
                      id={`categoryId-${product.id}`}
                      name="categoryId"
                      className={selectClassName}
                      defaultValue={product.categoryId ?? ""}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`brand-${product.id}`}>Marca</Label>
                    <Input id={`brand-${product.id}`} name="brand" defaultValue={product.brand ?? ""} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`imageUrl-${product.id}`}>URL da imagem</Label>
                    <Input id={`imageUrl-${product.id}`} name="imageUrl" defaultValue={product.imageUrl ?? ""} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`productUrl-${product.id}`}>URL do produto</Label>
                    <Input id={`productUrl-${product.id}`} name="productUrl" defaultValue={product.productUrl ?? ""} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`affiliateUrl-${product.id}`}>Link de afiliado (opcional)</Label>
                    <Input
                      id={`affiliateUrl-${product.id}`}
                      name="affiliateUrl"
                      defaultValue={source?.affiliateUrl ?? ""}
                      placeholder="Cole quando tiver o link de afiliado"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`description-${product.id}`}>Descrição</Label>
                    <textarea
                      id={`description-${product.id}`}
                      name="description"
                      defaultValue={product.description ?? ""}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="activate" value="true" defaultChecked className="size-4" />
                      Ativar ao salvar
                    </label>
                    <Button type="submit" size="sm">
                      Salvar
                    </Button>
                  </div>
                </form>
                {product.status !== "ACTIVE" && (
                  <form action={activate} className="mt-3">
                    <Button type="submit" size="sm" variant="outline">
                      Só ativar
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
