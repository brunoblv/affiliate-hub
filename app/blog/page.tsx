import Link from "next/link";
import { prisma } from "@/lib/database";

const PAGE_SIZE = 12;

export const metadata = { title: "Blog — Affiliate Manager" };

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; project?: string }>;
}) {
  const { page: pageParam, project: projectSlug } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [projects, project] = await Promise.all([
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    projectSlug ? prisma.affiliateProject.findUnique({ where: { slug: projectSlug } }) : Promise.resolve(null),
  ]);

  const where = { status: "PUBLISHED" as const, ...(project ? { projectId: project.id } : {}) };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { project: true },
    }),
    prisma.blogPost.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-muted-foreground">Ofertas, achados e conteúdo editorial.</p>

      <nav className="mt-6 flex flex-wrap gap-2 border-b pb-4 text-sm">
        <Link
          href="/blog"
          className={`rounded-md px-3 py-1.5 ${!projectSlug ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-muted"}`}
        >
          Tudo
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/blog?project=${p.slug}`}
            className={`rounded-md px-3 py-1.5 ${projectSlug === p.slug ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-muted"}`}
          >
            {p.name}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">Nenhum post publicado ainda.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block overflow-hidden rounded-lg border">
              {post.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImageUrl} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="p-4">
                {post.project && <span className="text-xs font-medium text-muted-foreground">{post.project.name}</span>}
                <h2 className="mt-1 font-semibold group-hover:underline">{post.title}</h2>
                {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link
              href={`/blog?page=${page - 1}${projectSlug ? `&project=${projectSlug}` : ""}`}
              className="rounded-md border px-3 py-1.5 hover:bg-muted"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/blog?page=${page + 1}${projectSlug ? `&project=${projectSlug}` : ""}`}
              className="rounded-md border px-3 py-1.5 hover:bg-muted"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
