import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";

export default async function PostsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Posts" description="Editorial, páginas de produto e listas." />
        <Button render={<Link href="/admin/posts/novo" />}>
          <Plus />
          Novo post
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={Newspaper} title="Nenhum post ainda" description="Crie o primeiro post pelo botão acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/posts/${post.id}`} className="hover:underline">
                    {post.titulo}
                  </Link>
                </TableCell>
                <TableCell>{post.tipo}</TableCell>
                <TableCell>
                  <Badge variant={post.status === "PUBLICADO" ? "default" : "secondary"}>
                    {post.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/posts" />
    </div>
  );
}
