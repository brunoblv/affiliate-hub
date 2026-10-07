import Link from "next/link";
import type { PublicBlog } from "@/lib/blog/queries";
import { mainSiteUrl } from "@/lib/blog/hosts";

/** "Capibusca" com a marca (Nunito, "busca" em verde). */
function CapibuscaWord({ busca = "text-blog-accent" }: { busca?: string }) {
  return (
    <span className="font-blog-brand font-black">
      Capi<span className={busca}>busca</span>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden className="flex-none">
      <circle cx="7.8" cy="7.8" r="5.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11.8 11.8 15.5 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Cabeçalho do blog. Links relativos: o proxy mantém o visitante no subdomínio. */
export function BlogHeader({ blog }: { blog: PublicBlog }) {
  return (
    <header className="border-b border-blog-line bg-blog-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-blog-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/capi/face-wink.png" alt="" className="size-9 rounded-[10px] object-cover" />
          <span className="flex flex-col leading-[1.15]">
            <span className="font-blog-brand text-[21px] font-black tracking-[-0.02em]">{blog.name}</span>
            <span className="text-[11px] font-semibold text-blog-muted">
              um blog <span className="text-blog-ink"><CapibuscaWord /></span>
            </span>
          </span>
        </Link>
        <nav aria-label="Blog" className="flex flex-1 items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-blog-ink">
            Artigos
          </Link>
          {blog.about ? (
            <Link href="/sobre" className="text-sm font-medium text-blog-muted hover:text-blog-ink">
              Sobre
            </Link>
          ) : null}
          <a href={mainSiteUrl("/")} className="hidden text-sm font-medium text-blog-muted hover:text-blog-ink sm:inline">
            Comparar preços ↗
          </a>
        </nav>
        <form action="/busca" method="get" role="search" className="flex h-[38px] w-full items-center gap-2 rounded-[10px] border border-blog-line bg-blog-bg px-3 text-blog-muted focus-within:border-blog-accent sm:w-[200px]">
          <SearchIcon />
          <label htmlFor="busca-blog" className="sr-only">
            Buscar artigos
          </label>
          <input id="busca-blog" type="search" name="q" placeholder="Buscar artigos" className="h-full w-full bg-transparent text-[13px] text-blog-ink outline-none placeholder:text-blog-muted" />
        </form>
      </div>
    </header>
  );
}

export function BlogFooter({ blog }: { blog: PublicBlog }) {
  const link = "text-[#CBD2CB] hover:text-white";
  return (
    <footer className="mt-24 bg-blog-ink text-[#CBD2CB]">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-10">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/capi/face-wink.png" alt="" className="size-[30px] rounded-lg object-cover" />
            <span className="font-blog-brand text-[19px] font-black text-white">{blog.name}</span>
          </span>
          {blog.tagline ? <p className="max-w-[380px] text-sm leading-relaxed">{blog.tagline}</p> : null}
          <p className="mt-1.5 text-xs text-[#98A2B3]">
            Um blog do{" "}
            <a href={mainSiteUrl("/")} className="text-white">
              <CapibuscaWord busca="text-[#22C55E]" />
            </a>
            , o comparador de preços.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <span className="text-[11px] font-bold tracking-[0.09em] text-[#98A2B3]">CONTEÚDO</span>
          <Link href="/" className={link}>Artigos</Link>
          <Link href="/busca" className={link}>Buscar</Link>
          {blog.about ? <Link href="/sobre" className={link}>Sobre</Link> : null}
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <span className="text-[11px] font-bold tracking-[0.09em] text-[#98A2B3]">INFORMAÇÕES</span>
          <a href={mainSiteUrl("/contato")} className={link}>Contato</a>
          <a href={mainSiteUrl("/termos-de-uso")} className={link}>Termos de uso</a>
          <a href={mainSiteUrl("/politica-de-privacidade")} className={link}>Privacidade</a>
          <a href={mainSiteUrl("/afiliados")} className={link}>Links de afiliado</a>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-[#98A2B3] sm:px-10">
        © {new Date().getFullYear()} {blog.name}
      </div>
    </footer>
  );
}
