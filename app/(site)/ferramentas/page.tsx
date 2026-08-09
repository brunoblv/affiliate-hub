export const metadata = { title: "Ferramentas — Meu Novo Lar" };

const CATEGORIES = ["Todas", "Construção", "Casa", "Organização", "Compras", "Finanças", "Conversores"];

const TOOLS = [
  { category: "CONSTRUÇÃO", title: "Calculadora de tinta", description: "Litros necessários por m²." },
  { category: "CONSTRUÇÃO", title: "Calculadora de piso", description: "Metragem e sobra de material." },
  { category: "COMPRAS", title: "Comparador de produtos", description: "Preço, loja e avaliação lado a lado." },
  { category: "ORGANIZAÇÃO", title: "Lista de compras", description: "Organize o que falta comprar." },
];

export default function FerramentasPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Ferramentas</h1>
      <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
        Calculadoras e utilitários gratuitos para facilitar decisões e projetos da sua casa. Funcionam sem cadastro.
      </p>

      <div className="mt-8 flex flex-wrap gap-2.5">
        {CATEGORIES.map((category, i) => (
          <span
            key={category}
            className={
              i === 0
                ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            }
          >
            {category}
          </span>
        ))}
      </div>

      <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => (
          <div key={tool.title} className="rounded-xl border border-border p-5">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-secondary">
              <span className="size-3.5 rounded-[3px] bg-sage" />
            </div>
            <div className="mb-2 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">{tool.category}</div>
            <div className="mb-1.5 text-[14.5px] font-semibold text-foreground">{tool.title}</div>
            <div className="text-[12.5px] leading-relaxed text-muted-foreground">{tool.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
