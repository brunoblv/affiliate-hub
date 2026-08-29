import Link from "next/link";
import type { Metadata } from "next";
import { prisma, Destino, type Categoria } from "@/lib/database";
import { descontoPercentual, primeiraImagem, HOME_CATEGORIAS, LABEL_CATEGORIA } from "@/lib/produtos";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Produtos selecionados para o seu lar — compare preços e encontre boas ofertas.",
};

const STORE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ehCategoriaCasa(valor: string | undefined): valor is Categoria {
  return HOME_CATEGORIAS.some((categoria) => categoria === valor);
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const categoriaAtiva = ehCategoriaCasa(categoria) ? categoria : null;

  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      destino: Destino.MEU_NOVO_LAR,
      categoria: categoriaAtiva ? categoriaAtiva : { in: HOME_CATEGORIAS },
    },
    orderBy: { atualizadoEm: "desc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-10 sm:py-16">
      <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">CATÁLOGO</div>
      <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">Produtos que valem a pena para sua casa</h1>
      <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
        Seleção de itens para casa com links para as lojas. Preços e disponibilidade podem mudar.
      </p>

      <div className="mt-7 flex flex-wrap gap-2.5">
        <Link
          href="/produtos"
          className={
            categoriaAtiva === null
              ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
              : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-sage"
          }
        >
          Todas
        </Link>
        {HOME_CATEGORIAS.map((cat) => (
          <Link
            key={cat}
            href={`/produtos?categoria=${cat}`}
            className={
              categoriaAtiva === cat
                ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-sage"
            }
          >
            {LABEL_CATEGORIA[cat]}
          </Link>
        ))}
      </div>

      {produtos.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">Nenhum produto publicado nessa categoria ainda.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => {
            const desconto = descontoPercentual(produto);
            const imagem = primeiraImagem(produto);
            return (
              <Link
                key={produto.id}
                href={`/produtos/${produto.slug}`}
                className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-sage"
              >
                <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3 sm:p-4">
                  {imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagem} alt={produto.nome} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">produto</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {STORE_LABEL[produto.plataforma] ?? produto.plataforma}
                    </span>
                    {desconto !== null && (
                      <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
                    )}
                  </div>
                  <div className="mb-1.5 line-clamp-2 text-sm font-semibold text-foreground">{produto.nome}</div>
                  <div className="flex items-baseline gap-2">
                    {produto.precoOriginal && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(Number(produto.precoOriginal))}
                      </span>
                    )}
                    <span className="text-lg font-bold text-foreground">{formatCurrency(Number(produto.precoAtual))}</span>
                  </div>
                  {produto.notaEditorial && (
                    <p className="mt-2.5 line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">
                      {produto.notaEditorial}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
