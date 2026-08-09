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
import { updateBlogPostAction, setBlogPostStatusAction } from "../actions";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, projects] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id } }),
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!post) notFound();

  const updateWithId = updateBlogPostAction.bind(null, post.id);
  const publishWithId = setBlogPostStatusAction.bind(null, post.id, BlogPostStatus.PUBLISHED);
  const unpublishWithId = setBlogPostStatusAction.bind(null, post.id, BlogPostStatus.DRAFT);

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
    </div>
  );
}
