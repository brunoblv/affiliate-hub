import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { PostsTabela } from "@/components/admin/posts-tabela";

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
        <PostsTabela
          posts={posts.map((post) => ({
            id: post.id,
            titulo: post.titulo,
            tipo: post.tipo,
            status: post.status,
          }))}
        />
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/posts" />
    </div>
  );
}
