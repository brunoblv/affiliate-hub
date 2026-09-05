import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { primeiraImagem } from "@/lib/produtos";
import { createPostAction } from "../actions";

export const maxDuration = 180;

export default async function NovoPostPage() {
  const produtosBrutos = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { slug: true, nome: true, imagens: true },
  });
  const produtos = produtosBrutos.map((p) => ({ slug: p.slug, nome: p.nome, imagem: primeiraImagem(p) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Novo post" description="Editor visual, com imagens no servidor e cards de produto." />
      <PostForm produtos={produtos} action={createPostAction} />
    </div>
  );
}
