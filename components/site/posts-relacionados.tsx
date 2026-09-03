import Link from "next/link";
import { prisma } from "@/lib/database";
import type { CategoriaEditorial, TipoPost } from "@/lib/generated/prisma/enums";
import { produtoVisivelNoSite } from "@/lib/produtos";
import { resolverCapa } from "@/lib/conteudo/capa";
import { CardProdutoCapa } from "@/components/site/card-produto";

interface Props {
  postId: string;
  tipo: TipoPost;
  categoriaEditorial: CategoriaEditorial | null;
}

export async function PostsRelacionados({ postId, tipo, categoriaEditorial }: Props) {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLICADO",
      tipo,
      categoriaEditorial,
      id: { not: postId },
    },
    include: {
      capa: true,
      produtos: { orderBy: { ordem: "asc" }, take: 1, include: { produto: true } },
    },
    orderBy: { publicadoEm: "desc" },
    take: 3,
  });

  if (posts.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-heading text-xl font-semibold text-foreground">Leia também</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {posts.map((post) => {
          const produto = post.produtos[0]?.produto;
          if (tipo === "PRODUTO" && produto && produtoVisivelNoSite(produto)) {
            return <CardProdutoCapa key={post.id} href={`/blog/${post.slug}`} produto={produto} />;
          }

          const capa = resolverCapa(post.capa, false, produto);
          return (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_8px,var(--background)_8px,var(--background)_16px)]">
                {capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capa.src} alt={capa.alt} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground">imagem</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground group-hover:underline">{post.titulo}</h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
