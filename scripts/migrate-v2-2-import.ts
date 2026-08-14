/**
 * Passo 2/2 da migração pro schema v2. Roda DEPOIS que o schema novo já foi
 * aplicado no banco (prisma migrate/db push) — lê scripts/.migration-snapshot.json
 * (gerado por migrate-v2-1-export.ts) e recria os dados nas tabelas novas.
 *
 * Idempotente: usa upsert por id preservado do registro antigo, então pode
 * rodar de novo sem duplicar.
 *
 * Uso:
 *   npx tsx scripts/migrate-v2-2-import.ts
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Plataforma, Rede, StatusPost, TipoPost } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface Snapshot {
  products: Array<{
    id: string;
    source: string;
    externalId: string;
    slug: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    price: string;
    originalPrice: string | null;
    status: string;
    createdAt: string;
  }>;
  affiliateLinks: Array<{ id: string; productId: string; channel: string; affiliateUrl: string; shortCode: string }>;
  blogPosts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    coverImageUrl: string | null;
    seoTitle: string | null;
    metaDescription: string | null;
    status: string;
    publishedAt: string | null;
    productId: string | null;
  }>;
  blogPostProducts: Array<{
    id: string;
    blogPostId: string;
    productId: string;
    order: number;
    label: string | null;
    note: string | null;
  }>;
  projectChannels: Array<{
    id: string;
    name: string;
    platform: string;
    active: boolean;
    externalPageId: string | null;
    externalChatId: string | null;
    cooldownDays: number;
  }>;
  newsletterSubscribers: Array<{
    id: string;
    email: string;
    status: string;
    unsubscribeToken: string;
    subscribedAt: string;
    unsubscribedAt: string | null;
  }>;
}

const PLATAFORMA_MAP: Record<string, Plataforma> = {
  MERCADO_LIVRE: Plataforma.MERCADO_LIVRE,
  AMAZON: Plataforma.AMAZON,
  SHOPEE: Plataforma.SHOPEE,
};

function mapPlataforma(source: string): Plataforma {
  return PLATAFORMA_MAP[source] ?? Plataforma.OUTRA;
}

async function main() {
  const arquivo = path.join(__dirname, ".migration-snapshot.json");
  const snapshot = JSON.parse(await readFile(arquivo, "utf-8")) as Snapshot;

  // ---- Produtos ----
  const linksByProduct = new Map<string, Snapshot["affiliateLinks"]>();
  for (const link of snapshot.affiliateLinks) {
    const lista = linksByProduct.get(link.productId) ?? [];
    lista.push(link);
    linksByProduct.set(link.productId, lista);
  }

  const idsProdutosMigrados = new Set<string>();
  let produtosPulados = 0;

  for (const p of snapshot.products) {
    const links = linksByProduct.get(p.id) ?? [];
    // Prioridade: link do canal BLOG > WEBSITE > qualquer outro registrado.
    const link =
      links.find((l) => l.channel === "BLOG") ?? links.find((l) => l.channel === "WEBSITE") ?? links[0];

    if (!link) {
      produtosPulados++;
      continue;
    }

    await prisma.produto.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        plataforma: mapPlataforma(p.source),
        idExterno: p.externalId,
        slug: p.slug,
        nome: p.name,
        descricao: p.description,
        imagens: p.imageUrl ? [p.imageUrl] : [],
        precoAtual: p.price,
        precoOriginal: p.originalPrice,
        linkAfiliado: link.affiliateUrl,
        codigoCurto: link.shortCode,
        ativo: p.status === "ACTIVE",
        criadoEm: new Date(p.createdAt),
      },
      update: {},
    });

    idsProdutosMigrados.add(p.id);
  }

  console.log(`Produtos migrados: ${idsProdutosMigrados.size} (pulados sem link de afiliado: ${produtosPulados})`);

  // ---- Posts ----
  const itensPorPost = new Map<string, Snapshot["blogPostProducts"]>();
  for (const item of snapshot.blogPostProducts) {
    const lista = itensPorPost.get(item.blogPostId) ?? [];
    lista.push(item);
    itensPorPost.set(item.blogPostId, lista);
  }

  let postsMigrados = 0;

  for (const post of snapshot.blogPosts) {
    let capaId: string | null = null;
    if (post.coverImageUrl) {
      const midia = await prisma.midia.upsert({
        where: { url: post.coverImageUrl },
        create: {
          url: post.coverImageUrl,
          caminho: "migrado/v1",
          nomeOriginal: "capa-migrada",
          mimeType: "image/external",
          tamanhoBytes: 0,
        },
        update: {},
      });
      capaId = midia.id;
    }

    const itens = (itensPorPost.get(post.id) ?? []).filter((item) => idsProdutosMigrados.has(item.productId));

    // Produto único gerado automaticamente (sem passar por blog_post_products).
    const produtoUnicoSlug =
      !itens.length && post.productId && idsProdutosMigrados.has(post.productId)
        ? snapshot.products.find((p) => p.id === post.productId)?.slug
        : undefined;

    const slugsProdutos = itens.length
      ? itens.map((item) => snapshot.products.find((p) => p.id === item.productId)?.slug).filter((s): s is string => !!s)
      : produtoUnicoSlug
        ? [produtoUnicoSlug]
        : [];

    const shortcodes = slugsProdutos.map((slug) => `[produto:${slug}]`).join("\n\n");
    const corpo = shortcodes ? `${post.body}\n\n${shortcodes}` : post.body;

    const tipo: TipoPost = itens.length > 0 ? TipoPost.LISTA : post.productId ? TipoPost.PRODUTO : TipoPost.JORNADA;

    const novoPost = await prisma.post.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        tipo,
        titulo: post.title,
        slug: post.slug,
        resumo: post.excerpt,
        corpo,
        capaId,
        seoTitulo: post.seoTitle,
        metaDescricao: post.metaDescription,
        status: post.status === "PUBLISHED" ? StatusPost.PUBLICADO : StatusPost.RASCUNHO,
        publicadoEm: post.publishedAt ? new Date(post.publishedAt) : null,
      },
      update: {},
    });

    for (const item of itens) {
      const produtoId = item.productId;
      if (!idsProdutosMigrados.has(produtoId)) continue;
      await prisma.itemDePost.upsert({
        where: { postId_produtoId: { postId: novoPost.id, produtoId } },
        create: { postId: novoPost.id, produtoId, ordem: item.order, rotulo: item.label, nota: item.note },
        update: {},
      });
    }

    postsMigrados++;
  }

  console.log(`Posts migrados: ${postsMigrados}`);

  // ---- Canais ----
  const REDE_MAP: Record<string, Rede> = { FACEBOOK: Rede.FACEBOOK_PAGE, INSTAGRAM: Rede.INSTAGRAM, TELEGRAM: Rede.TELEGRAM };
  let canaisMigrados = 0;

  for (const canal of snapshot.projectChannels) {
    const rede = REDE_MAP[canal.platform];
    const idExterno = canal.externalPageId ?? canal.externalChatId;
    if (!rede || !idExterno) continue;

    await prisma.canal.upsert({
      where: { rede_idExterno: { rede, idExterno } },
      create: {
        id: canal.id,
        nome: canal.name,
        rede,
        idExterno,
        ativo: canal.active,
        horarios: [],
        cooldownDias: canal.cooldownDays,
      },
      update: {},
    });
    canaisMigrados++;
  }

  console.log(`Canais migrados: ${canaisMigrados} (horários zerados — configure em /admin/canais)`);

  // ---- Assinantes ----
  let assinantesMigrados = 0;
  for (const sub of snapshot.newsletterSubscribers) {
    await prisma.assinante.upsert({
      where: { id: sub.id },
      create: {
        id: sub.id,
        email: sub.email,
        ativo: sub.status === "ACTIVE",
        tokenBaixa: sub.unsubscribeToken,
        criadoEm: new Date(sub.subscribedAt),
        baixaEm: sub.unsubscribedAt ? new Date(sub.unsubscribedAt) : null,
      },
      update: {},
    });
    assinantesMigrados++;
  }

  console.log(`Assinantes migrados: ${assinantesMigrados}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
