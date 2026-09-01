"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, Newspaper, Pencil } from "lucide-react";
import { resolverContextoEdicao, type ContextoEdicao } from "@/lib/auth/resolver-edicao";

/**
 * Barra só no cliente, depois do `useSession`. O HTML público continua em ISR
 * (`revalidate` no layout do site) e nunca inclui estes links para visitantes.
 */
export function AdminBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [edicao, setEdicao] = useState<ContextoEdicao>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setEdicao(null);
      return;
    }

    let cancelado = false;
    void resolverContextoEdicao(pathname).then((resultado) => {
      if (!cancelado) setEdicao(resultado);
    });

    return () => {
      cancelado = true;
    };
  }, [pathname, status]);

  if (status !== "authenticated" || !session?.user) return null;

  const nome = session.user.name || session.user.email || "Admin";

  return (
    <div className="sticky top-0 z-50 print:hidden bg-foreground text-background">
      <nav
        aria-label="Barra do administrador"
        className="mx-auto flex h-10 max-w-[1200px] items-center gap-3 px-5 text-xs sm:px-10"
      >
        <span className="shrink-0 font-semibold tracking-tight">Admin</span>

        {edicao && (
          <Link
            href={edicao.href}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Pencil className="size-3.5" aria-hidden />
            {edicao.rotulo}
          </Link>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-background/80 hover:bg-background/10 hover:text-background"
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Painel</span>
          </Link>
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-background/80 hover:bg-background/10 hover:text-background"
          >
            <Newspaper className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Posts</span>
          </Link>
          <span className="hidden max-w-40 truncate text-background/60 md:inline" title={nome}>
            {nome}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-background/80 hover:bg-background/10 hover:text-background"
          >
            <LogOut className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
