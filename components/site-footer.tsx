import Link from "next/link";
import { listNiches } from "@/lib/catalog";

/**
 * The affiliate-monetization notice is a requirement, not decoration (§12):
 * it has to be reachable from every public page.
 */
export async function SiteFooter() {
  const niches = await listNiches();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex flex-col gap-3">
          <span className="text-base font-bold tracking-[-0.02em]">
            Affiliate<span className="text-brand">Hub</span>
          </span>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            Comparamos as ofertas que monitoramos nas lojas parceiras. Preço e disponibilidade
            finais são confirmados na loja escolhida.
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            Ganhamos comissão sobre compras feitas pelos links de afiliado. Isso não altera a
            ordenação por preço nem o valor pago por você.
          </p>
        </div>

        <nav aria-label="Nichos" className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            Nichos
          </span>
          {niches.slice(0, 6).map((category) => (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              className="text-[13px] text-muted hover:text-brand"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <nav aria-label="Plataforma" className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            Plataforma
          </span>
          <Link href="/ofertas" className="text-[13px] text-muted hover:text-brand">
            Ofertas do dia
          </Link>
          <Link href="/conta" className="text-[13px] text-muted hover:text-brand">
            Favoritos e alertas
          </Link>
          <Link href="/admin/produtos" className="text-[13px] text-muted hover:text-brand">
            Administração
          </Link>
        </nav>
      </div>
    </footer>
  );
}
