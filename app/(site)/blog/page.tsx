import Link from "next/link";
import { prisma } from "@/lib/database";
import { resolverCapa } from "@/lib/conteudo/capa";

const PAGE_SIZE = 12;

export const metadata = { title: "Blog — Meu Novo Lar" };

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { status: "PUBLICADO" as const };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { capa: true },
      orderBy: { publicadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [featured, ...rest] = posts;
  const capaDestaque = featured ? resolverCapa(featured.capa) : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Blog</h1>
      <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
        Conteúdos para deixar sua casa mais prática, bonita e funcional.
      </p>

      {posts.length === 0 || !featured ? (
        <p className="mt-16 text-center text-muted-foreground">Nenhum post publicado ainda.</p>
      ) : (
        <>
          <Link href={`/blog/${featured.slug}`} className="mt-9 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="flex h-80 items-center justify-center overflow-hidden rounded-xl bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_10px,var(--background)_10px,var(--background)_20px)]">
              {capaDestaque ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capaDestaque.src} alt={capaDestaque.alt} className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">imagem destaque</span>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-2.5 text-[10px] font-bold tracking-[0.08em] text-olive">DESTAQUE</span>
              <h2 className="font-heading text-[27px] leading-[1.25] font-semibold text-foreground">{featured.titulo}</h2>
              {featured.resumo && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{featured.resumo}</p>}
            </div>
          </Link>

          {rest.length > 0 && (
            <div className="mt-11 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                  <div className="mb-3.5 flex h-44 items-center justify-center overflow-hidden rounded-lg bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_8px,var(--background)_8px,var(--background)_16px)]">
                    {post.capa ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.capa.url} alt={post.capa.alt ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground">imagem</span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-heading text-base font-semibold text-foreground group-hover:underline">{post.titulo}</h3>
                  {post.resumo && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.resumo}</p>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link
              href={`/blog?page=${page - 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/blog?page=${page + 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
