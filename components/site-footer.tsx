import Link from "next/link";
import { Wordmark } from "./icons";
import { listNiches } from "@/lib/catalog";
import { institutionalLinks } from "@/lib/institutional";

/**
 * The affiliate-monetization notice is a requirement, not decoration (§12):
 * it has to be reachable from every public page.
 */
export async function SiteFooter() {
  const niches = await listNiches();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col gap-3">
          <Wordmark className="text-xl" />
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            Comparamos as ofertas que monitoramos nas lojas parceiras. Preço e disponibilidade
            finais são confirmados na loja escolhida.
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted">
            Ganhamos comissão sobre compras feitas pelos links de afiliado. Isso não altera a
            ordenação por preço nem o valor pago por você.{" "}
            <Link href="/afiliados" className="underline hover:text-brand">
              Saiba mais
            </Link>
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
          <Link href="/guias" className="text-[13px] text-muted hover:text-brand">
            Guias de compra
          </Link>
          <Link href="/conta" className="text-[13px] text-muted hover:text-brand">
            Favoritos e alertas
          </Link>
          <Link href="/admin/produtos" className="text-[13px] text-muted hover:text-brand">
            Administração
          </Link>
        </nav>

        <nav aria-label="Institucional" className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            Institucional
          </span>
          {institutionalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13px] text-muted hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
