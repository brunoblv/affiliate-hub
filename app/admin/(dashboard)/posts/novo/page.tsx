import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { createPostAction } from "../actions";

export const maxDuration = 180;

export default async function NovoPostPage() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { slug: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Novo post" description="Editor visual, com imagens no servidor e cards de produto." />
      <PostForm produtos={produtos} action={createPostAction} />
    </div>
  );
}
