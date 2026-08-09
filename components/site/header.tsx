import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Casa" },
  { href: "/blog", label: "Blog" },
  { href: "/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/ferramentas", label: "Ferramentas" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] items-center gap-9 px-5 py-4 sm:px-10">
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
        <div className="ml-auto flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground md:ml-0">
          <span className="size-3 rounded-full border border-current" />
          <span className="sr-only">Buscar</span>
        </div>
      </div>
    </header>
  );
}
