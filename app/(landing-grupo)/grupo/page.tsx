import type { Metadata } from "next";
import { prisma, Destino } from "@/lib/database";
import { GRUPO_WHATSAPP_URL } from "@/lib/site-publico";
import { getSiteUrl } from "@/lib/site-url";
import {
  HOME_CATEGORIAS,
  deduplicarCatalogo,
  descontoPercentual,
  produtoVisivelNoSite,
} from "@/lib/produtos";
import { obterConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import {
  BotaoGrupoWhatsapp,
  ListaBeneficiosGrupo,
  MockupCelularGrupo,
  SelosConfiancaGrupo,
  type ItemMockupGrupo,
} from "@/components/site/landing-grupo";

export const revalidate = 300;

const TITULO = "Achadinhos de casa no WhatsApp — Meu Novo Lar";
const DESCRICAO =
  "Grupo gratuito com ofertas da Shopee, TikTok Shop e Mercado Livre para casa: organização, cozinha, limpeza e decoração.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${getSiteUrl()}/grupo` },
  robots: { index: false, follow: true },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${getSiteUrl()}/grupo`,
    locale: "pt_BR",
    type: "website",
  },
};

const LOJAS = ["Shopee", "TikTok Shop", "Mercado Livre"];
const CATEGORIAS_RODAPE = [
  "Casa",
  "Organização",
  "Cozinha",
  "Banheiro",
  "Lavanderia",
  "Limpeza",
  "Decoração",
  "Iluminação",
];

async function resolverLinkGrupo(): Promise<string> {
  try {
    const [achadinhos, casa] = await Promise.all([
      obterConfiguracaoVitrine(Destino.TIKTOK_SHOP),
      obterConfiguracaoVitrine(Destino.MEU_NOVO_LAR),
    ]);
    return achadinhos.linkGrupoWhatsapp || casa.linkGrupoWhatsapp || GRUPO_WHATSAPP_URL;
  } catch {
    return GRUPO_WHATSAPP_URL;
  }
}

async function ofertasDeExemplo(): Promise<ItemMockupGrupo[]> {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true, destino: Destino.MEU_NOVO_LAR, categoria: { in: HOME_CATEGORIAS } },
      orderBy: { criadoEm: "desc" },
      take: 24,
      select: {
        id: true,
        nome: true,
        slug: true,
        imagens: true,
        precoAtual: true,
        precoOriginal: true,
        ativo: true,
        destino: true,
        categoria: true,
      },
    });
    const itens: ItemMockupGrupo[] = [];
    for (const produto of deduplicarCatalogo(produtos.filter(produtoVisivelNoSite))) {
      const desconto = descontoPercentual(produto);
      if (desconto === null) continue;
      itens.push({
        id: produto.id,
        nome: produto.nome,
        imagens: produto.imagens,
        precoAtual: produto.precoAtual,
        precoOriginal: produto.precoOriginal,
        desconto,
      });
      if (itens.length >= 4) break;
    }
    return itens;
  } catch {
    return [];
  }
}

export default async function LandingGrupoPage() {
  const [href, itens] = await Promise.all([resolverLinkGrupo(), ofertasDeExemplo()]);

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-16">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-primary">GRUPO DE OFERTAS PARA CASA</p>
            <h1 className="mt-3 max-w-xl font-heading text-4xl leading-[1.12] font-semibold text-foreground sm:text-5xl">
              Achadinhos da Shopee, TikTok e Mercado Livre no WhatsApp
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted-foreground">
              Promoções e cupons de item de casa — organização, cozinha, banheiro, limpeza, decoração —
              direto no seu celular. Sem app extra: é o grupo do WhatsApp.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {LOJAS.map((loja) => (
                <span
                  key={loja}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold tracking-wide text-foreground"
                >
                  {loja}
                </span>
              ))}
            </div>

            <div className="mt-7">
              <ListaBeneficiosGrupo />
            </div>

            <div className="mt-8">
              <BotaoGrupoWhatsapp href={href} />
            </div>
            <div className="mt-4">
              <SelosConfiancaGrupo />
            </div>
          </div>

          <div className="pb-4 lg:pb-0">
            <MockupCelularGrupo itens={itens} />
          </div>
        </div>

        <div className="border-t border-border bg-secondary px-5 py-3 text-center text-[11px] font-bold tracking-[0.12em] text-muted-foreground sm:px-8">
          {CATEGORIAS_RODAPE.join("  ·  ")}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Como funciona</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Entra no grupo", d: "Um toque no botão verde abre o convite do WhatsApp. É grátis." },
            { n: "2", t: "Recebe as ofertas", d: "Quando aparece promoção de casa nas lojas, a gente manda no grupo." },
            { n: "3", t: "Você decide", d: "Abre o link, confere na loja e compra só se fizer sentido pra você." },
          ].map((passo) => (
            <li key={passo.n} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {passo.n}
              </div>
              <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">{passo.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{passo.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-2xl border border-sage/40 bg-secondary px-5 py-8 text-center sm:px-8">
          <h2 className="font-heading text-2xl font-semibold text-foreground">Quer receber as próximas ofertas?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            O grupo é o canal rápido. O site continua com o blog e a vitrine, se você preferir olhar com calma.
          </p>
          <div className="mx-auto mt-6 flex justify-center">
            <BotaoGrupoWhatsapp href={href} />
          </div>
        </div>
      </section>
    </>
  );
}
