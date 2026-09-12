import Link from "next/link";
import { CookieBanner } from "@/components/site/cookie-banner";
import { Analytics } from "@/components/site/analytics";

export default function LandingGrupoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-card px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Meu Novo Lar
          </Link>
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">GRUPO DE OFERTAS</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-foreground px-5 py-8 text-center text-xs leading-relaxed text-secondary/70 sm:px-8">
        <p>
          Alguns links compartilhados no grupo são de afiliado: se você comprar por eles, o Meu Novo Lar pode
          receber uma comissão, sem custo a mais pra você. Preço e estoque mudam na loja.
        </p>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/privacy-policy" className="text-background hover:underline">
            Privacidade
          </Link>
          <Link href="/terms" className="text-background hover:underline">
            Termos
          </Link>
          <Link href="/" className="text-background hover:underline">
            meunovolar.com
          </Link>
        </p>
      </footer>
      <CookieBanner />
      <Analytics />
    </div>
  );
}
