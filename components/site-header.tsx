import Link from "next/link";
import { auth, signOut } from "@/auth";
import { LogoMark, SearchIcon } from "./icons";

export async function SiteHeader({ term = "" }: { term?: string }) {
  const user = (await auth())?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-7 gap-y-3 px-4 py-3 sm:px-8">
        <Link href="/" className="flex flex-none items-center gap-2.5">
          <LogoMark />
          <span className="text-base font-bold tracking-[-0.02em]">
            Affiliate<span className="text-brand">Hub</span>
          </span>
        </Link>

        <form
          action="/busca"
          role="search"
          className="order-3 w-full min-w-0 flex-1 md:order-none md:w-auto md:max-w-[640px]"
        >
          <label htmlFor="busca-topo" className="sr-only">
            Buscar produtos
          </label>
          <div className="flex h-[42px] items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3.5 focus-within:border-brand">
            <SearchIcon className="flex-none text-muted" />
            <input
              id="busca-topo"
              name="q"
              type="search"
              defaultValue={term}
              placeholder="O que você está procurando?"
              className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </div>
        </form>

        <nav aria-label="Principal" className="ml-auto flex flex-wrap items-center gap-3 md:ml-0">
          <Link href="/comunidades" className="text-sm font-medium hover:text-brand">Comunidades</Link>
          <Link href="/categoria/celulares" className="text-sm font-medium hover:text-brand">
            Categorias
          </Link>
          <Link href="/ofertas" className="text-sm font-medium hover:text-brand">
            Ofertas
          </Link>
          {user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className="text-sm font-medium hover:text-brand">
                  Admin
                </Link>
              )}
              <Link href="/conta" className="text-sm font-semibold text-brand">
                {user.name?.split(" ")[0] ?? "Minha conta"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-sm font-medium text-muted hover:text-brand">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="text-sm font-semibold text-brand">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
