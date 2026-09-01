import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { ExcluirPostButton } from "@/components/admin/excluir-post-button";
import { DistribuirPostButton } from "@/components/admin/distribuir-post-button";
import { GerarNarracaoButton } from "@/components/admin/gerar-narracao-button";
import { updatePostAction } from "../actions";

export const maxDuration = 120;

export default async function EditarPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, produtos] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { capa: true, audio: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { slug: true, nome: true } }),
  ]);
  if (!post) notFound();

  const action = updatePostAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={post.titulo} description={`/blog/${post.slug}`} />
        <ExcluirPostButton id={post.id} titulo={post.titulo} />
      </div>
      <GerarNarracaoButton postId={post.id} audioUrl={post.audio?.url ?? null} />
      {post.tipo === "LISTA" && post.status === "PUBLICADO" && <DistribuirPostButton postId={post.id} />}
      <PostForm post={post} produtos={produtos} action={action} />
    </div>
  );
}
