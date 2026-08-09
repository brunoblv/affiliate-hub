import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminBlogPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { project: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Blog"
          description="Posts editoriais escritos manualmente e posts gerados automaticamente a partir de produtos com link de afiliado."
        />
        <Link href="/admin/blog/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus />
          Novo post
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={Newspaper} title="Nenhum post criado ainda" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/blog/${post.id}`} className="hover:underline">
                    {post.title}
                  </Link>
                </TableCell>
                <TableCell>{post.project?.name ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {post.source === "MANUAL" ? "Manual" : post.source.replace("_AUTO", "").replaceAll("_", " ")}
                </TableCell>
                <TableCell>
                  <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>{post.status}</Badge>
                </TableCell>
                <TableCell>{post.publishedAt ? post.publishedAt.toLocaleDateString("pt-BR") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
