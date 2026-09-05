import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { ExcluirPostButton } from "@/components/admin/excluir-post-button";
import { DistribuirPostButton } from "@/components/admin/distribuir-post-button";
import { GerarNarracaoButton } from "@/components/admin/gerar-narracao-button";
import { GerarFichaProdutoButton } from "@/components/admin/gerar-ficha-produto-button";
import { LarSmartPostTools } from "@/components/admin/larsmart-post-tools";
import { fichaProdutoVazia } from "@/lib/conteudo/corpo";
import { primeiraImagem } from "@/lib/produtos";
import { updatePostAction } from "../actions";

export const maxDuration = 180;

export default async function EditarPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, produtosBrutos] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: { capa: true, audio: true, produtos: { orderBy: { ordem: "asc" }, include: { produto: { select: { slug: true, nome: true } } } } },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { slug: true, nome: true, imagens: true },
    }),
  ]);
  if (!post) notFound();
  const produtos = produtosBrutos.map((p) => ({ slug: p.slug, nome: p.nome, imagem: primeiraImagem(p) }));

  const action = updatePostAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={post.titulo} description={`/blog/${post.slug}`} />
        <ExcluirPostButton id={post.id} titulo={post.titulo} />
      </div>
      {post.tipo === "PRODUTO" && (
        <GerarFichaProdutoButton postId={post.id} fichaVazia={fichaProdutoVazia(post.corpo)} />
      )}
      <GerarNarracaoButton postId={post.id} audioUrl={post.audio?.url ?? null} />
      {post.larsmartPauta !== null && (
        <LarSmartPostTools postId={post.id} produtos={post.produtos.map((item) => item.produto)} />
      )}
      {post.tipo === "LISTA" && post.status === "PUBLICADO" && <DistribuirPostButton postId={post.id} />}
      {post.tipo === "JORNADA" && post.status === "PUBLICADO" && (
        <DistribuirPostButton postId={post.id} tipo="JORNADA" />
      )}
      <PostForm key={`${post.id}-${post.atualizadoEm.getTime()}`} post={post} produtos={produtos} action={action} />
    </div>
  );
}
