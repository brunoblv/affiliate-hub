/**
 * Cadastra o produto de exemplo do AliExpress com landing page completa (fotos, oferta,
 * link de afiliado, especificações e conteúdo editorial publicado).
 *
 *   npx tsx scripts/seed-aliexpress-example.ts [--nicho <slug>] [--categoria <slug>] [--confirmar]
 *
 * (No Windows PowerShell, `npm run ... -- --confirmar` perde o `--` e o flag não chega ao script.)
 *
 * Sem --confirmar só simula: valida o texto, mostra o banco de destino e o que seria feito.
 *
 * Com ALIEXPRESS_APP_KEY/SECRET o preço, as fotos e o link vêm da API; sem eles, usa o retrato
 * do anúncio tirado em 06/10/2026 (oferta MANUAL, o worker não atualiza o preço).
 * Pode rodar de novo: se o item já estiver cadastrado, só atualiza o conteúdo.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { aliExpressConnector } from "@/lib/connectors/aliexpress";
import { attachFetchedOffer, uniqueProductSlug } from "@/lib/admin/import-offer";
import type { FetchResult } from "@/lib/connectors";
import { productSearchText } from "@/lib/search-text";
import { hasErrors, sanitizeSections, validateSections } from "@/lib/content/validate";
import { PROMPT_VERSION } from "@/lib/content/types";

const ITEM_ID = "1005012631924049";
const SHORT_LINK = "https://s.click.aliexpress.com/e/_c3sxJyKh";
const ITEM_URL = `https://pt.aliexpress.com/item/${ITEM_ID}.html`;

const NAME = "Cavaleiros do Zodíaco Myth Cloth EX Aiolia de Leão (CS Model)";
const LISTING_TITLE =
  "Modelo CS Saint Seiya Myth Cloth EX Leo Aiolia Cavaleiros de Ouro dos Cavaleiros do Zodíaco Figura de Ação Brinquedo Colecionável";

const SNAPSHOT: Extract<FetchResult, { kind: "ok" }> = {
  kind: "ok",
  priceCents: 19299,
  previousPriceCents: 39386,
  commercialContext: {},
  availability: null,
  title: LISTING_TITLE,
  sellerName: "Big Devil Boutique Trendy Toys Store",
  imageUrl: "https://ae-pic-a1.aliexpress-media.com/kf/S0597681df4414a17a1cb2a6649b5e6724.jpg",
  imageUrls: [
    "S0597681df4414a17a1cb2a6649b5e6724",
    "S4ab0d488fc18414496668b9a55aab1922",
    "S562b6292092d40ea8660b34a696e5ae7E",
    "Saee3b33949c344b4ae031f42daf4a1336",
    "Se13bd128df4d4891924389e772285b6e8",
    "Se6480a8e9b2942159f4ff4a3eb922971E",
  ].map((id) => `https://ae-pic-a1.aliexpress-media.com/kf/${id}.jpg`),
  affiliateUrl: SHORT_LINK,
  observedAt: new Date("2026-10-06T15:00:00Z"),
};

/** Só o que o anúncio e as fotos mostram: é a fonte de fatos do texto. */
const SOURCE_MATERIAL = `Anúncio AliExpress ${ITEM_ID} (loja Big Devil Boutique Trendy Toys Store).
Título: ${LISTING_TITLE}.
Franquia: Saint Seiya / Os Cavaleiros do Zodíaco. Personagem: Aiolia de Leão, Cavaleiro de Ouro.
Linha: Myth Cloth EX. Fabricante indicado no título: CS (modelo CS), não Bandai/Tamashii Nations.
Tipo: figura de ação colecionável. Condição: novo.
Fotos: armadura dourada com detalhes em verde, elmo com gema verde, capa azul, figura em pé sem
suporte; caixa amarela com a ilustração da cabeça do leão e arabescos.
O anúncio não informa altura, materiais, pontos de articulação nem acessórios extras.`;

const SECTIONS = sanitizeSections({
  title: "Aiolia de Leão Myth Cloth EX: o Cavaleiro de Ouro de Leão para a estante",
  summary:
    "Figura de ação colecionável de Aiolia de Leão, de Os Cavaleiros do Zodíaco, no estilo da linha Myth Cloth EX, com armadura dourada, capa azul e caixa temática do leão. Versão da fabricante CS, vendida pelo AliExpress.",
  description: `Aiolia de Leão é o guardião da Casa de Leão no Santuário e um dos Cavaleiros de Ouro mais marcantes de Os Cavaleiros do Zodíaco. Esta figura reproduz o personagem com a armadura de ouro completa, no estilo da linha Myth Cloth EX, que ficou conhecida pelas proporções mais realistas e pelo acabamento brilhante das armaduras.

Pelas fotos do anúncio, a armadura tem o dourado intenso típico dos Cavaleiros de Ouro, com detalhes em verde no peitoral e na gema do elmo, que traz a crista em forma de juba. A capa azul completa o visual clássico do personagem e dá movimento às poses na estante.

A peça é a versão da fabricante CS, indicada no título do anúncio como "modelo CS". Isso significa que não é o lançamento oficial da Bandai/Tamashii Nations: é uma alternativa para quem quer completar a coleção dos Cavaleiros de Ouro sem procurar a edição original, que costuma ser rara e mais disputada.

Ela chega em uma caixa amarela ilustrada com a cabeça do leão e arabescos, no mesmo espírito das caixas das armaduras de ouro, o que ajuda tanto na exposição quanto no armazenamento.

O anúncio não informa altura, materiais nem a quantidade de articulações. Se esses pontos forem decisivos para você, confira a página do produto e as perguntas de outros compradores no AliExpress antes de fechar a compra.`,
  benefits: [
    "Aiolia de Leão com a armadura de ouro completa e capa azul",
    "Estilo da linha Myth Cloth EX, com proporções mais realistas",
    "Detalhes em verde no peitoral e gema verde no elmo com crista de juba",
    "Caixa temática amarela com a ilustração do leão, boa para guardar ou expor",
    "Alternativa à edição oficial para completar a coleção dos Cavaleiros de Ouro",
  ],
  audience:
    "Faz sentido para fãs de Os Cavaleiros do Zodíaco que estão montando a coleção dos doze Cavaleiros de Ouro, para quem quer uma peça de exposição do Aiolia sem buscar a edição oficial e para presentear quem cresceu assistindo à série. Quem coleciona só itens originais Bandai deve procurar outra opção.",
  howToUse: null,
  limitations: [
    "Não é produto oficial Bandai/Tamashii Nations: é a versão da fabricante CS.",
    "O anúncio não informa altura, materiais nem pontos de articulação.",
    "Não há informação sobre suporte, mãos extras ou forma de objeto (totem) da armadura.",
    "Envio internacional pelo AliExpress: prazo de entrega maior que o de lojas nacionais.",
    "Frete e impostos de importação são calculados no carrinho do AliExpress.",
    "Peças pequenas: não é indicado para crianças pequenas.",
  ],
  faq: [
    {
      question: "Esta figura é original da Bandai?",
      answer:
        "Não. O título do anúncio identifica a peça como modelo CS, de uma fabricante independente. Ela segue o estilo da linha Myth Cloth EX, mas não é o lançamento oficial da Bandai/Tamashii Nations.",
    },
    {
      question: "Qual é o tamanho da figura?",
      answer:
        "O anúncio não informa a altura. Vale conferir a página do produto ou perguntar ao vendedor no AliExpress antes de comprar.",
    },
    {
      question: "O que vem na caixa?",
      answer:
        "Pelas fotos, a figura do Aiolia com a armadura de ouro e a capa azul, em uma caixa amarela com a ilustração do leão. O anúncio não lista acessórios extras.",
    },
    {
      question: "Vou pagar imposto de importação?",
      answer:
        "Compras internacionais no AliExpress podem ter impostos de importação. O valor final, com frete e impostos, aparece no carrinho antes de você confirmar o pedido.",
    },
    {
      question: "O produto é novo?",
      answer: "Sim, o anúncio é de item novo.",
    },
  ],
  metaTitle: "Aiolia de Leão Myth Cloth EX (CS Model) – Cavaleiros do Zodíaco",
  metaDescription:
    "Figura colecionável de Aiolia de Leão no estilo Myth Cloth EX, com armadura dourada, capa azul e caixa do leão. Veja o histórico de preço no AliExpress.",
});

const SPECS = [
  { key: "Franquia", value: "Os Cavaleiros do Zodíaco (Saint Seiya)" },
  { key: "Personagem", value: "Aiolia de Leão (Cavaleiro de Ouro)" },
  { key: "Linha", value: "Myth Cloth EX (versão CS Model)" },
  { key: "Fabricante", value: "CS Model (não oficial Bandai)" },
  { key: "Tipo", value: "Figura de ação colecionável" },
  { key: "Na caixa", value: "Figura com armadura de ouro e capa azul" },
  { key: "Embalagem", value: "Caixa amarela temática do leão" },
  { key: "Condição", value: "Novo" },
  { key: "Envio", value: "Internacional (AliExpress)" },
];

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

/** Host/banco do DATABASE_URL, sem usuário e senha. */
function databaseTarget(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "(DATABASE_URL inválido)";
  }
}

async function dryRun(issues: ReturnType<typeof validateSections>) {
  const store = await prisma.store.findUnique({ where: { slug: "aliexpress" } });
  const existing = store
    ? await prisma.offer.findFirst({ where: { storeId: store.id, externalListingId: ITEM_ID }, include: { variant: { include: { product: true } } } })
    : null;
  for (const [flag, exists] of [
    ["--nicho", arg("--nicho") ? await prisma.niche.findUnique({ where: { slug: arg("--nicho")! } }) : true],
    ["--categoria", arg("--categoria") ? await prisma.category.findUnique({ where: { slug: arg("--categoria")! } }) : true],
  ] as const) {
    if (!exists) throw new Error(`${flag} "${arg(flag)}" não existe nesse banco.`);
  }

  console.log("SIMULAÇÃO (nada foi gravado). Rode de novo com --confirmar para aplicar.\n");
  console.log(`Loja AliExpress: ${store ? `já existe (conector: ${store.connector ?? "nenhum"})` : "será criada"}`);
  if (existing) {
    console.log(`Produto: já cadastrado (/produto/${existing.variant.product.slug}); só o conteúdo será atualizado.`);
  } else {
    console.log(`Produto: será criado e publicado — "${NAME}"`);
    console.log(
      aliExpressConnector.isConfigured()
        ? "Oferta: preço, fotos e loja virão da API do AliExpress (retrato do anúncio se a API não devolver o item)."
        : `Oferta: retrato do anúncio (R$ ${(SNAPSHOT.priceCents / 100).toFixed(2)}, ${SNAPSHOT.imageUrls!.length} fotos), sem atualização automática de preço.`,
    );
    console.log(`Link de afiliado: ${SHORT_LINK}`);
  }
  console.log(`Nicho: ${arg("--nicho") ?? "(nenhum)"} · Categoria: ${arg("--categoria") ?? "(nenhuma)"}`);
  if (issues.length) console.log("Avisos do conteúdo:", issues.map((issue) => issue.message).join(" | "));
}

async function main() {
  const issues = validateSections(SECTIONS, SOURCE_MATERIAL);
  if (hasErrors(issues)) throw new Error(`Conteúdo com erros: ${JSON.stringify(issues, null, 2)}`);

  console.log(`Banco de destino: ${databaseTarget()} (NODE_ENV=${process.env.NODE_ENV ?? "indefinido"})`);
  if (!process.argv.includes("--confirmar")) return dryRun(issues);

  const store = await prisma.store.upsert({
    where: { slug: "aliexpress" },
    update: { connector: aliExpressConnector.key, method: "API" },
    create: { slug: "aliexpress", name: "AliExpress", connector: aliExpressConnector.key, method: "API" },
  });

  const niche = arg("--nicho") ? await prisma.niche.findUnique({ where: { slug: arg("--nicho")! } }) : null;
  const category = arg("--categoria") ? await prisma.category.findUnique({ where: { slug: arg("--categoria")! } }) : null;
  if (arg("--nicho") && !niche) throw new Error(`Nicho "${arg("--nicho")}" não existe.`);
  if (arg("--categoria") && !category) throw new Error(`Categoria "${arg("--categoria")}" não existe.`);

  const existing = await prisma.offer.findFirst({
    where: { storeId: store.id, externalListingId: ITEM_ID },
    include: { variant: true },
  });

  let productId: string;
  if (existing) {
    productId = existing.variant.productId;
    console.log("Item já cadastrado: atualizando o conteúdo.");
  } else {
    let result = SNAPSHOT;
    let fromApi = false;
    if (aliExpressConnector.isConfigured()) {
      const live = await aliExpressConnector.fetchOffer({ externalListingId: ITEM_ID, externalSellerId: null, originalUrl: ITEM_URL });
      if (live.kind === "ok") {
        result = { ...live, imageUrls: live.imageUrls?.length ? live.imageUrls : SNAPSHOT.imageUrls };
        fromApi = true;
      } else {
        console.warn("A API não devolveu o item (fora do programa de afiliados?): usando o retrato do anúncio.");
      }
    }

    const product = await prisma.product.create({
      data: {
        name: NAME,
        slug: await uniqueProductSlug(NAME),
        brand: "CS Model",
        model: "Myth Cloth EX Leo Aiolia",
        searchText: productSearchText({ name: `${NAME} saint seiya leo`, brand: "CS Model", model: "Myth Cloth EX Leo Aiolia" }),
        summary: SECTIONS.summary,
        specs: SPECS,
        status: "PUBLISHED",
        categoryId: category?.id ?? null,
        variants: { create: { label: "Padrão", isDefault: true } },
        niches: niche ? { create: { nicheId: niche.id } } : undefined,
      },
      include: { variants: true },
    });
    productId = product.id;

    const offer = await attachFetchedOffer({
      productId,
      variantId: product.variants[0].id,
      store,
      listingId: ITEM_ID,
      sellerId: null,
      originalUrl: ITEM_URL,
      // O link curto é o do próprio afiliado: tem prioridade sobre o gerado pela API.
      result: { ...result, affiliateUrl: SHORT_LINK },
    });
    if (!fromApi) {
      await prisma.offer.update({ where: { id: offer.id }, data: { method: "MANUAL", availability: "IN_STOCK" } });
      await prisma.pricePoint.updateMany({ where: { offerId: offer.id }, data: { source: "MANUAL" } });
    }
    console.log(`Oferta criada (${fromApi ? "API" : "retrato do anúncio"}).`);
  }

  const contentData = {
    sourceMaterial: SOURCE_MATERIAL,
    sections: SECTIONS as unknown as object,
    issues: issues as unknown as object,
    pendencies: [] as unknown as object,
    status: "PUBLISHED" as const,
    model: "manual",
    promptVersion: PROMPT_VERSION,
    generatedAt: new Date(),
    reviewedAt: new Date(),
    publishedAt: new Date(),
  };
  await prisma.productContent.upsert({
    where: { productId },
    update: contentData,
    create: { productId, ...contentData },
  });

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  // O caminho vale para o site que usa este banco (local ou produção).
  console.log(`Pronto: /produto/${product.slug} (gravado em ${databaseTarget()})`);
  if (issues.length) console.log("Avisos do conteúdo:", issues.map((issue) => issue.message).join(" | "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
