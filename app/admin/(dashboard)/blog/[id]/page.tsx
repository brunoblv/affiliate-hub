import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlogPostStatus } from "@/lib/generated/prisma/client";
import {
  updateBlogPostAction,
  setBlogPostStatusAction,
  addBlogPostProductAction,
  removeBlogPostProductAction,
  moveBlogPostProductAction,
} from "../actions";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, projects] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: { items: { orderBy: { order: "asc" }, include: { product: true } } },
    }),
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!post) notFound();

  const addedProductIds = new Set(post.items.map((item) => item.productId));
  const candidateProducts = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(post.projectId ? { projectId: post.projectId } : {}),
      id: { notIn: [...addedProductIds] },
    },
    orderBy: { name: "asc" },
    take: 300,
    select: { id: true, name: true },
  });

  const updateWithId = updateBlogPostAction.bind(null, post.id);
  const publishWithId = setBlogPostStatusAction.bind(null, post.id, BlogPostStatus.PUBLISHED);
  const unpublishWithId = setBlogPostStatusAction.bind(null, post.id, BlogPostStatus.DRAFT);
  const addProductWithId = addBlogPostProductAction.bind(null, post.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={post.title} description={`/blog/${post.slug}`} />
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>{post.status}</Badge>
          {post.status === "PUBLISHED" ? (
            <form action={unpublishWithId}>
              <Button type="submit" variant="outline" size="sm">
                Despublicar
              </Button>
            </form>
          ) : (
            <form action={publishWithId}>
              <Button type="submit" size="sm">
                Publicar
              </Button>
            </form>
          )}
          {post.status === "PUBLISHED" && (
            <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-muted-foreground hover:underline">
              Ver no blog →
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form key={post.id} action={updateWithId} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" defaultValue={post.title} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto</Label>
              <select
                id="projectId"
                name="projectId"
                defaultValue={post.projectId ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">URL da imagem de capa</Label>
              <Input id="coverImageUrl" name="coverImageUrl" type="url" defaultValue={post.coverImageUrl ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Resumo</Label>
              <textarea
                id="excerpt"
                name="excerpt"
                rows={2}
                defaultValue={post.excerpt ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Conteúdo *</Label>
              <textarea
                id="body"
                name="body"
                rows={20}
                required
                defaultValue={post.body}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-sm font-semibold">Produtos do post</h2>
            <p className="text-sm text-muted-foreground">
              Landing page tipo "roundup" (vários produtos numa página) — cada item usa o link de afiliado real do
              produto (canal Blog), nunca a URL crua da loja.
            </p>
          </div>

          {post.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto adicionado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {post.items.map((item, index) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    {item.label && <p className="text-xs font-medium text-muted-foreground">{item.label}</p>}
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(item.product.price))}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={moveBlogPostProductAction.bind(null, post.id, item.id, "up")}>
                      <Button type="submit" variant="outline" size="sm" disabled={index === 0}>
                        ↑
                      </Button>
                    </form>
                    <form action={moveBlogPostProductAction.bind(null, post.id, item.id, "down")}>
                      <Button type="submit" variant="outline" size="sm" disabled={index === post.items.length - 1}>
                        ↓
                      </Button>
                    </form>
                    <form action={removeBlogPostProductAction.bind(null, post.id, item.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Remover
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addProductWithId} className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="productId">Adicionar produto</Label>
              <select
                id="productId"
                name="productId"
                required
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Selecione um produto…
                </option>
                {candidateProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {candidateProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum produto disponível{post.projectId ? " nesse projeto" : ""} pra adicionar.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="label">Rótulo (opcional)</Label>
                <Input id="label" name="label" placeholder="Ex: 1. Óleo de limpeza" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input id="note" name="note" placeholder="Ex: Remove maquiagem sem ressecar a pele." />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="outline" size="sm" disabled={candidateProducts.length === 0}>
                Adicionar produto
              </Button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground">
            A existência de um link de afiliado é validada no envio — se o produto não tiver nenhum link cadastrado,
            a adição falha.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
