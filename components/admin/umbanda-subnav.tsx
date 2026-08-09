"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/afiliados/umbanda", label: "Visão geral" },
  { href: "/admin/afiliados/umbanda/produtos", label: "Produtos e ofertas" },
  { href: "/admin/afiliados/umbanda/campanhas", label: "Campanhas" },
  { href: "/admin/afiliados/umbanda/canais", label: "Página e grupos" },
  { href: "/admin/afiliados/umbanda/publicacoes", label: "Publicações" },
  { href: "/admin/afiliados/umbanda/analytics", label: "Analytics" },
];

export function UmbandaSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {TABS.map((tab) => {
        const active = tab.href === "/admin/afiliados/umbanda" ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
