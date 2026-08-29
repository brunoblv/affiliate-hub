import Link from "next/link";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 20;

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-4 pt-2 text-sm">
      <PaginationLink href={page > 1 ? hrefFor(page - 1) : undefined}>← Anterior</PaginationLink>
      <span className="text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <PaginationLink href={page < totalPages ? hrefFor(page + 1) : undefined}>Próxima →</PaginationLink>
    </div>
  );
}

function PaginationLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) {
    return <span className={cn("rounded-md border border-border px-3 py-1.5 text-muted-foreground/40")}>{children}</span>;
  }
  return (
    <Link href={href} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
      {children}
    </Link>
  );
}
