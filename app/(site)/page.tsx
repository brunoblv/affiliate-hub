import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { descontoPercentual, primeiraImagem } from "@/lib/produtos";
import { CAPA_EDITORIAL, resolverCapa } from "@/lib/conteudo/capa";
import { NewsletterForm } from "./newsletter-form";

const TOOLS = [
  { title: "Calculadora de tinta", description: "Descubra quantos litros você precisa comprar.", href: "/ferramentas/calculadora-de-tinta" },
  { title: "Calculadora de piso", description: "Calcule a metragem certa para o seu ambiente.", href: "/ferramentas/calculadora-de-piso" },
  { title: "Lista de compras", description: "Organize o que falta comprar para casa.", href: "/ferramentas/lista-de-compras" },
  { title: "Comparador de produtos", description: "Compare preço, loja e avaliação lado a lado.", href: "/ferramentas/comparador-de-produtos" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function HomePage() {
  const [posts, produtos] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLICADO" },
      include: { capa: true },
      orderBy: { publicadoEm: "desc" },
      take: 3,
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
      take: 12,
    }),
  ]);

  const deals = produtos
    .filter((produto) => descontoPercentual(produto) !== null)
    .slice(0, 3);

  return (
    <>
      {/* Hero */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-14 sm:px-10 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div>
          <div className="text-xs font-bold tracking-[0.14em] text-primary">IDEIAS PARA O SEU LAR</div>
          <h1 className="mt-4 max-w-md font-heading text-4xl leading-[1.15] font-semibold text-foreground sm:text-5xl">
            Deixe sua casa mais prática, bonita e funcional.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Inspiração, dicas, produtos selecionados e ferramentas úteis para o dia a dia da sua casa.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/blog" />} className="px-6">
              Explorar conteúdos
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/ofertas" />} className="px-6">
              Ver ofertas
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl">
          <Image
            src={CAPA_EDITORIAL.src}
            alt={CAPA_EDITORIAL.alt}
            width={1024}
            height={682}
            priority
            className="h-auto w-full object-cover"
          />
        </div>
      </div>

      {/* Conteúdos recentes */}
      {posts.length > 0 && (
        <div className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-10">
          <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">CONTEÚDOS RECENTES</div>
          <h2 className="mb-7 font-heading text-2xl font-semibold text-foreground sm:text-[26px]">Ideias para o seu lar</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {posts.map((post, indice) => {
              const capa = resolverCapa(post.capa, indice === 0);
              return (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <div className="mb-3.5 flex h-44 items-center justify-center overflow-hidden rounded-lg bg-[repeating-linear-gradient(45deg,var(--sand),var(--sand)_8px,var(--background)_8px,var(--background)_16px)]">
                  {capa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capa.src} alt={capa.alt} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">imagem</span>
                  )}
                </div>
                <h3 className="mt-1.5 font-heading text-[17px] font-semibold text-foreground group-hover:underline">
                  {post.titulo}
                </h3>
                {post.resumo && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.resumo}</p>}
                <span className="mt-2 block text-xs font-medium text-muted-foreground">{readingTime(post.corpo)} min de leitura</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Ofertas */}
      {deals.length > 0 && (
        <div id="ofertas" className="bg-secondary px-5 py-14 sm:px-10">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">OFERTAS QUE ENCONTRAMOS</div>
            <div className="mb-7 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-[26px]">Boas oportunidades para sua casa</h2>
              <span className="text-xs font-medium text-muted-foreground">Atualizado hoje</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {deals.map((produto) => {
                const desconto = descontoPercentual(produto);
                const imagem = primeiraImagem(produto);
                return (
                  <Link key={produto.id} href={`/produtos/${produto.slug}`} className="block overflow-hidden rounded-xl bg-card">
                    <div className="flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3 sm:p-4">
                      {imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imagem} alt={produto.nome} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground">produto</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-end">
                        {desconto !== null && (
                          <span className="rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">
                            -{desconto}%
                          </span>
                        )}
                      </div>
                      <div className="mb-1.5 line-clamp-2 text-sm font-semibold text-foreground">{produto.nome}</div>
                      <div className="flex items-baseline gap-2">
                        {produto.precoOriginal && (
                          <span className="text-xs text-muted-foreground line-through">{formatCurrency(Number(produto.precoOriginal))}</span>
                        )}
                        <span className="text-lg font-bold text-foreground">{formatCurrency(Number(produto.precoAtual))}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ferramentas */}
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-10">
        <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground">FERRAMENTAS</div>
        <h2 className="mb-7 font-heading text-2xl font-semibold text-foreground sm:text-[26px]">Ferramentas para facilitar sua vida</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="block rounded-xl border border-border p-5">
              <div className="mb-3.5 flex size-10 items-center justify-center rounded-lg bg-secondary">
                <span className="size-3.5 rounded-[3px] bg-sage" />
              </div>
              <div className="mb-1.5 text-sm font-semibold text-foreground">{tool.title}</div>
              <div className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">{tool.description}</div>
              <span className="text-xs font-semibold text-primary">Usar ferramenta →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-t border-border px-5 py-11 sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6">
          <div>
            <div className="mb-1 font-heading text-lg font-semibold text-foreground">Receba boas ideias para sua casa</div>
            <div className="text-sm text-muted-foreground">Dicas, ferramentas e ofertas selecionadas, sem spam.</div>
          </div>
          <NewsletterForm />
        </div>
      </div>
    </>
  );
}
