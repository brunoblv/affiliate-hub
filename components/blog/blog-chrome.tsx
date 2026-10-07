import Link from "next/link";
import type { PublicBlog } from "@/lib/blog/queries";
import { mainSiteUrl } from "@/lib/blog/hosts";

/** Cabeçalho do blog. Links relativos: o proxy mantém o visitante no subdomínio. */
export function BlogHeader({ blog }: { blog: PublicBlog }) {
  return (
    <header className="border-b border-blog-line bg-blog-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 sm:px-10">
        <Link href="/" className="font-blog-heading text-[22px] font-semibold tracking-tight text-blog-ink">
          {blog.name}
        </Link>
        <nav aria-label="Blog" className="flex flex-1 items-center gap-6">
          <Link href="/" className="text-sm font-medium text-blog-muted hover:text-blog-ink">
            Artigos
          </Link>
          {blog.about ? (
            <Link href="/sobre" className="text-sm font-medium text-blog-muted hover:text-blog-ink">
              Sobre
            </Link>
          ) : null}
        </nav>
        <form action="/busca" method="get" role="search" className="flex items-center gap-2">
          <label htmlFor="busca-blog" className="sr-only">
            Buscar no blog
          </label>
          <input
            id="busca-blog"
            type="search"
            name="q"
            placeholder="Buscar artigos"
            className="h-9 w-44 rounded-lg border border-blog-line bg-blog-bg px-3 text-sm text-blog-ink outline-none placeholder:text-blog-muted focus:border-blog-accent"
          />
        </form>
      </div>
    </header>
  );
}

export function BlogFooter({ blog }: { blog: PublicBlog }) {
  return (
    <footer className="mt-20 bg-blog-ink text-blog-soft">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-10">
        <div>
          <div className="font-blog-heading text-lg font-semibold text-blog-surface">{blog.name}</div>
          {blog.tagline ? <p className="mt-2 max-w-md text-sm leading-relaxed opacity-75">{blog.tagline}</p> : null}
          <p className="mt-4 text-xs opacity-60">
            Um blog do{" "}
            <a href={mainSiteUrl("/")} className="underline underline-offset-2 hover:text-blog-surface">
              Capibusca
            </a>
            , o comparador de preços.
          </p>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.09em] opacity-70">CONTEÚDO</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/" className="hover:text-blog-surface">Artigos</Link>
            <Link href="/busca" className="hover:text-blog-surface">Buscar</Link>
            {blog.about ? <Link href="/sobre" className="hover:text-blog-surface">Sobre</Link> : null}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.09em] opacity-70">INFORMAÇÕES</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <a href={mainSiteUrl("/contato")} className="hover:text-blog-surface">Contato</a>
            <a href={mainSiteUrl("/termos-de-uso")} className="hover:text-blog-surface">Termos de uso</a>
            <a href={mainSiteUrl("/politica-de-privacidade")} className="hover:text-blog-surface">Privacidade</a>
            <a href={mainSiteUrl("/afiliados")} className="hover:text-blog-surface">Links de afiliado</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-xs opacity-60 sm:px-10">
        © {new Date().getFullYear()} {blog.name}
      </div>
    </footer>
  );
}
