import Link from "next/link";
import { FERRAMENTAS } from "@/lib/ferramentas";

export const metadata = { title: "Ferramentas — Meu Novo Lar" };

export default function FerramentasPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Ferramentas</h1>
      <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
        Calculadoras e utilitários gratuitos para facilitar decisões e projetos da sua casa. Funcionam sem cadastro.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FERRAMENTAS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-xl border border-border p-5 transition-colors hover:border-sage"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-secondary">
              <span className="size-3.5 rounded-[3px] bg-sage" />
            </div>
            <div className="mb-2 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">{tool.category}</div>
            <div className="mb-1.5 text-[14.5px] font-semibold text-foreground">{tool.title}</div>
            <div className="mb-3.5 text-[12.5px] leading-relaxed text-muted-foreground">{tool.description}</div>
            <span className="text-xs font-semibold text-primary">Usar ferramenta →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
