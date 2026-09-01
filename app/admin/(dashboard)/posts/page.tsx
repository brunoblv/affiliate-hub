import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { PostsTabela } from "@/components/admin/posts-tabela";
import { FiltroTipoPosts } from "@/components/admin/filtro-tipo-posts";
import { TipoPost } from "@/lib/database/enums";
import { ehTipoPost, LABEL_TIPO_POST } from "@/lib/conteudo/tipos-post";

export default async function PostsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipo?: string }>;
}) {
  const { page: pageParam, tipo: tipoParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const tipo = ehTipoPost(tipoParam) ? tipoParam : null;
  const where = tipo ? { tipo } : {};

  const [posts, total, agrupado, totalGeral] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
    prisma.post.groupBy({ by: ["tipo"], _count: { _all: true } }),
    prisma.post.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const porTipo: Partial<Record<TipoPost, number>> = {};
  for (const grupo of agrupado) {
    porTipo[grupo.tipo] = grupo._count._all;
  }

  const descricaoFiltro = tipo
    ? `Filtrando ${LABEL_TIPO_POST[tipo].toLowerCase()} — ${total} no total.`
    : "Editorial, páginas de produto e listas.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Posts" description={descricaoFiltro} />
        <Button render={<Link href="/admin/posts/novo" />}>
          <Plus />
          Novo post
        </Button>
      </div>

      <FiltroTipoPosts atual={tipo} total={totalGeral} porTipo={porTipo} />

      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={tipo ? `Nenhum post de ${LABEL_TIPO_POST[tipo].toLowerCase()}` : "Nenhum post ainda"}
          description={tipo ? "Cadastre ou gere um post deste tipo." : "Crie o primeiro post pelo botão acima."}
        />
      ) : (
        <PostsTabela
          posts={posts.map((post) => ({
            id: post.id,
            titulo: post.titulo,
            tipo: post.tipo,
            status: post.status,
          }))}
          esconderTipo={tipo !== null}
        />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/posts"
        searchParams={tipo ? { tipo } : undefined}
      />
    </div>
  );
}
