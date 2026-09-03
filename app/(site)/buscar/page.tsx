import Link from "next/link";
import { prisma, Destino, StatusPost, TipoPost } from "@/lib/database";
import { resolverCapa } from "@/lib/conteudo/capa";
import { HOME_CATEGORIAS, primeiraImagem, produtoVisivelNoSite } from "@/lib/produtos";

export const metadata = {
  title: "Buscar — Meu Novo Lar",
  description: "Busque artigos e produtos de casa no Meu Novo Lar.",
};

const LIMITE = 20;
const MAX_Q = 80;

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: bruto } = await searchParams;
  const q = (bruto ?? "").trim().slice(0, MAX_Q);

  const [posts, produtosBrutos] = q
    ? await Promise.all([
        prisma.post.findMany({
          where: {
            status: StatusPost.PUBLICADO,
            tipo: TipoPost.JORNADA,
            OR: [
              { titulo: { contains: q, mode: "insensitive" } },
              { resumo: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { capa: true },
          orderBy: { publicadoEm: "desc" },
          take: LIMITE,
        }),
        prisma.produto.findMany({
          where: {
            ativo: true,
            destino: Destino.MEU_NOVO_LAR,
            categoria: { in: HOME_CATEGORIAS },
            nome: { contains: q, mode: "insensitive" },
          },
          orderBy: { atualizadoEm: "desc" },
          take: LIMITE,
        }),
      ])
    : [[], []];

  const produtos = produtosBrutos.filter(produtoVisivelNoSite);

  return (
    <div className="mx-auto w-full max-w-[800px] px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Buscar</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Artigos editoriais e produtos de casa cadastrados no site.
      </p>

      <form action="/buscar" method="get" role="search" className="mt-8">
        <label htmlFor="q" className="sr-only">
          Buscar no site
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ex.: organização da cozinha"
            className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Buscar
          </button>
        </div>
      </form>

      {!q ? (
        <p className="mt-10 text-sm text-muted-foreground">Digite um termo para ver artigos e produtos.</p>
      ) : posts.length === 0 && produtos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Nenhum resultado para “{q}”. Tente outra palavra ou veja o{" "}
          <Link href="/blog" className="underline">
            blog
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {posts.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">Artigos</h2>
              <ul className="mt-4 space-y-4">
                {posts.map((post) => {
                  const capa = resolverCapa(post.capa);
                  return (
                    <li key={post.id}>
                      <Link href={`/blog/${post.slug}`} className="flex gap-4 hover:underline">
                        {capa ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={capa.src} alt={capa.alt} className="size-16 shrink-0 rounded-md object-cover" />
                        ) : null}
                        <span>
                          <span className="block font-medium text-foreground">{post.titulo}</span>
                          {post.resumo ? (
                            <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{post.resumo}</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {produtos.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">Produtos</h2>
              <ul className="mt-4 space-y-4">
                {produtos.map((produto) => {
                  const imagem = primeiraImagem(produto);
                  return (
                    <li key={produto.id}>
                      <Link href={`/produtos/${produto.slug}`} className="flex gap-4 hover:underline">
                        {imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagem} alt={produto.nome} className="size-16 shrink-0 rounded-md object-contain" />
                        ) : null}
                        <span className="font-medium text-foreground">{produto.nome}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
