import Link from "next/link";
import { Search } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Casa" },
  { href: "/blog", label: "Blog" },
  { href: "/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/vitrine", label: "Ofertas do dia" },
  { href: "/ferramentas", label: "Ferramentas" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-5 py-4 sm:gap-9 sm:px-10">
        <Link href="/" className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Meu Novo Lar
        </Link>
        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/buscar" method="get" role="search" className="ml-auto flex min-w-0 items-center gap-2 md:ml-0">
          <label htmlFor="busca-site" className="sr-only">
            Buscar no site
          </label>
          <input
            id="busca-site"
            type="search"
            name="q"
            placeholder="Buscar"
            className="hidden h-8 w-36 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:block sm:w-44"
          />
          <button
            type="submit"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            aria-label="Buscar"
          >
            <Search className="size-3.5" />
          </button>
        </form>
      </div>
    </header>
  );
}
