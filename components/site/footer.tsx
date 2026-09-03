import Link from "next/link";
import { EMAIL_CONTATO, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site-publico";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-secondary">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-5 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:py-14">
        <div>
          <div className="font-heading text-lg font-semibold text-background">Meu Novo Lar</div>
          <p className="mt-2 text-sm leading-relaxed text-secondary/70">
            Publicação sobre casa e cotidiano: organização, cozinha, limpeza, decoração e o que realmente entra no lar.
          </p>
          <address className="mt-4 not-italic text-sm">
            <a href={`mailto:${EMAIL_CONTATO}`} className="text-background hover:underline">
              {EMAIL_CONTATO}
            </a>
            <div className="mt-1">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-background hover:underline"
              >
                Instagram {INSTAGRAM_HANDLE}
              </a>
            </div>
          </address>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.09em] text-secondary/70">CONTEÚDO</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/blog" className="hover:text-background">Blog</Link>
            <Link href="/produtos" className="hover:text-background">Produtos</Link>
            <Link href="/ofertas" className="hover:text-background">Ofertas</Link>
            <Link href="/vitrine" className="hover:text-background">Ofertas do dia</Link>
            <Link href="/buscar" className="hover:text-background">Buscar</Link>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.09em] text-secondary/70">FERRAMENTAS</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/ferramentas" className="hover:text-background">Todas as ferramentas</Link>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.09em] text-secondary/70">INFORMAÇÕES</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/sobre" className="hover:text-background">Sobre</Link>
            <Link href="/equipe" className="hover:text-background">Equipe Editorial</Link>
            <Link href="/contato" className="hover:text-background">Contato</Link>
            <Link href="/terms" className="hover:text-background">Termos de Uso</Link>
            <Link href="/privacy-policy" className="hover:text-background">Política de Privacidade</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-secondary/10 px-5 py-4 text-xs text-secondary/60 sm:px-10">
        © {new Date().getFullYear()} Meu Novo Lar
      </div>
    </footer>
  );
}
