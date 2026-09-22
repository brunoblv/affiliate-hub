import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto flex max-w-[640px] flex-col items-start gap-4 px-4 py-24 sm:px-8">
        <h1 className="text-[28px] font-extrabold tracking-[-0.035em]">Página não encontrada</h1>
        <p className="text-[15px] text-muted">
          O endereço acessado não existe ou o produto foi retirado do catálogo. Use a busca para
          encontrar o que procura.
        </p>
        <Link
          href="/busca"
          className="flex h-[42px] items-center rounded-[9px] bg-brand px-4.5 text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
        >
          Ir para a busca
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
