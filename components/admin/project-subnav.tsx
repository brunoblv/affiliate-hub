"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectSubnav({ projectSlug }: { projectSlug: string }) {
  const pathname = usePathname();
  const base = `/admin/afiliados/${projectSlug}`;

  const tabs = [
    { href: base, label: "Visão geral" },
    { href: `${base}/produtos`, label: "Produtos e ofertas" },
    { href: `${base}/importar-links`, label: "Importar links" },
    { href: `${base}/capturar`, label: "Capturar" },
    { href: `${base}/revisar`, label: "Revisar" },
    { href: `${base}/campanhas`, label: "Campanhas" },
    { href: `${base}/canais`, label: "Página e grupos" },
    { href: `${base}/publicacoes`, label: "Publicações" },
    { href: `${base}/grupos`, label: "Central de Grupos" },
    { href: `${base}/analytics`, label: "Analytics" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === tab.href : pathname?.startsWith(tab.href);
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
