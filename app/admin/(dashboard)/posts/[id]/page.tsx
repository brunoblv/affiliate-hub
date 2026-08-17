import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { ExcluirPostButton } from "@/components/admin/excluir-post-button";
import { updatePostAction } from "../actions";

export default async function EditarPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, produtos] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { capa: true } }),
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
      <PostForm post={post} produtos={produtos} action={action} />
    </div>
  );
}
