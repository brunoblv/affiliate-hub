import Link from "next/link";
import { cn } from "@/lib/utils";
import { TipoPost } from "@/lib/database/enums";
import { LABEL_TIPO_POST, TIPOS_POST } from "@/lib/conteudo/tipos-post";

export function FiltroTipoPosts({
  atual,
  total,
  porTipo,
}: {
  atual: TipoPost | null;
  total: number;
  porTipo: Partial<Record<TipoPost, number>>;
}) {
  const abas: Array<{ value: TipoPost | null; label: string; count: number; href: string }> = [
    { value: null, label: "Todos", count: total, href: "/admin/posts" },
    ...TIPOS_POST.map((tipo) => ({
      value: tipo,
      label: LABEL_TIPO_POST[tipo],
      count: porTipo[tipo] ?? 0,
      href: `/admin/posts?tipo=${tipo}`,
    })),
  ];

  return (
    <nav aria-label="Filtrar posts por tipo" className="inline-flex min-h-8 flex-wrap items-center rounded-lg bg-muted p-[3px]">
      {abas.map((aba) => {
        const ativo = aba.value === atual;
        return (
          <Link
            key={aba.label}
            href={aba.href}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 text-sm font-medium transition-colors",
              ativo ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {aba.label}
            <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{aba.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
