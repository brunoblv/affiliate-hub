/**
 * Migra o blog do meu-novo-lar para o blog "meunovolar" do Capibusca.
 *
 *   npx tsx scripts/migrate-meunovolar.ts             -> simulação: só lê e mostra o que faria
 *   npx tsx scripts/migrate-meunovolar.ts --aplicar   -> grava
 *
 * Opções: --destinos=MEU_NOVO_LAR,TIKTOK_SHOP (padrão MEU_NOVO_LAR)  --tipos=JORNADA,LISTA,PRODUTO (padrão: todos)
 *         --sobrescrever (atualiza posts já migrados)
 *
 * Variáveis: DATABASE_URL (Capibusca), MEUNOVOLAR_DATABASE_URL (banco do meu-novo-lar, só leitura),
 * MEUNOVOLAR_MEDIA_ROOT (pasta MEDIA_ROOT do meu-novo-lar) e MEDIA_DIR (destino, ver .env.example).
 *
 * O que faz, sem apagar nada na origem:
 * - posts (slugs preservados: os 301 de meunovolar.com/blog/x batem com /blog/x no subdomínio);
 * - mídia (capa, áudio, imagens do corpo) copiada com o mesmo caminho /midia/...;
 * - produtos citados: casa com a oferta já cadastrada (mesma loja + ID externo); sem par, cria
 *   produto em RASCUNHO com a oferta e o link. Em ambos, o código /go/<código> antigo vira um
 *   link de afiliado aqui, para os links já publicados nas redes continuarem valendo;
 * - notas da jornada (as de espiritualidade ficam de fora).
 * Reexecutar é seguro: o que já existe é pulado (ou atualizado com --sobrescrever).
 */
import "dotenv/config";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { prisma } from "@/lib/db";
import type { EditorialCategory, PostKind } from "@/lib/generated/prisma/enums";
import { referencedImages, referencedProducts } from "@/lib/blog/body";
import { syncPostRelations } from "@/lib/blog/posts";
import { mediaRoot } from "@/lib/media/storage";
import { loadBlogFile } from "@/lib/blog/ai/prompts";
import { uniqueProductSlug } from "@/lib/admin/import-offer";
import { productSearchText } from "@/lib/search-text";

const APPLY = process.argv.includes("--aplicar");
const OVERWRITE = process.argv.includes("--sobrescrever");
const DESTINOS = (process.argv.find((arg) => arg.startsWith("--destinos="))?.split("=")[1] ?? "MEU_NOVO_LAR").split(",");
const TIPOS = (process.argv.find((arg) => arg.startsWith("--tipos="))?.split("=")[1] ?? "JORNADA,LISTA,PRODUTO").split(",");

const KIND: Record<string, PostKind> = { JORNADA: "EDITORIAL", PRODUTO: "PRODUCT", LISTA: "LIST" };
const CATEGORY: Record<string, EditorialCategory> = {
  DICAS_CASA: "HOME_TIPS",
  JORNADA_APARTAMENTO: "APARTMENT_JOURNEY",
  JORNADA_ESPIRITUAL: "SPIRITUAL_JOURNEY",
  REFLEXAO_ESPIRITUAL: "SPIRITUAL_REFLECTION",
  GUIA_ESPIRITUALIDADE: "SPIRITUALITY_GUIDE",
};
const CONNECTOR: Record<string, string> = { MERCADO_LIVRE: "mercadolivre", SHOPEE: "shopee" };

interface SourcePost {
  id: string;
  tipo: string;
  categoriaEditorial: string | null;
  titulo: string;
  slug: string;
  resumo: string | null;
  corpo: string;
  capaId: string | null;
  audioId: string | null;
  seoTitulo: string | null;
  metaDescricao: string | null;
  status: string;
  publicadoEm: Date | null;
  avisoSeguranca: boolean;
  larsmartPauta: unknown;
  criadoEm: Date;
  autor: string | null;
}

interface SourceMedia {
  id: string;
  url: string;
  caminho: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  largura: number | null;
  altura: number | null;
  alt: string | null;
}

interface SourceProduct {
  id: string;
  slug: string;
  plataforma: string;
  idExterno: string;
  nome: string;
  descricao: string | null;
  imagens: unknown;
  precoAtual: string;
  precoOriginal: string | null;
  linkAfiliado: string;
  codigoCurto: string;
}

const report = { posts: 0, postsSkipped: 0, media: 0, mediaMissing: [] as string[], productsMatched: 0, productsCreated: 0, productsSkipped: [] as string[], goCodes: 0, goCodesTaken: [] as string[], notes: 0, notesSkipped: 0, larsmart: 0 };

/** Pauta do LarSmart antigo (PautaListaCasa) -> ListBrief daqui; categorias não têm equivalente. */
function briefFrom(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const brief = raw as Record<string, unknown>;
  if (typeof brief.titulo !== "string") return undefined;
  return {
    id: String(brief.id ?? ""),
    grupo: brief.grupo === "comodo" ? "comodo" : "tema",
    dica: typeof brief.comodoId === "string" ? brief.comodoId : null,
    titulo: brief.titulo,
    angulo: String(brief.angulo ?? ""),
    termos: Array.isArray(brief.termosNome) ? brief.termosNome.map(String) : [],
    quantidade: Number(brief.quantidade) || 5,
    preferirPromocao: brief.preferirPromocao === true,
    avisoSeguranca: brief.avisoSeguranca === true,
  };
}

const cents = (value: string | null) => (value === null ? null : Math.round(Number(value) * 100));

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}.`);
  return value;
}

async function main() {
  const source = new Pool({ connectionString: env("MEUNOVOLAR_DATABASE_URL"), max: 2 });
  const sourceMediaRoot = env("MEUNOVOLAR_MEDIA_ROOT");
  console.log(APPLY ? "MODO APLICAR: gravando no Capibusca." : "SIMULAÇÃO: nada será gravado (use --aplicar).");
  console.log(`Destinos: ${DESTINOS.join(", ")} · tipos: ${TIPOS.join(", ")} · mídia de ${sourceMediaRoot} para ${mediaRoot()}\n`);

  // --- Leitura da origem --------------------------------------------------------
  const posts = (
    await source.query<SourcePost>(
      `SELECT p.id, p.tipo, p."categoriaEditorial", p.titulo, p.slug, p.resumo, p.corpo, p."capaId", p."audioId",
              p."seoTitulo", p."metaDescricao", p.status, p."publicadoEm", p."avisoSeguranca", p."larsmartPauta", p."criadoEm",
              u.name AS autor
         FROM posts p LEFT JOIN users u ON u.id = p."autorId"
        WHERE p.destino::text = ANY($1) AND p.tipo::text = ANY($2)
        ORDER BY p."criadoEm"`,
      [DESTINOS, TIPOS],
    )
  ).rows;
  const others = (await source.query<{ destino: string; total: string }>(`SELECT destino::text, count(*) AS total FROM posts WHERE NOT (destino::text = ANY($1)) GROUP BY destino`, [DESTINOS])).rows;

  const itemRows = (await source.query<{ postId: string; produtoId: string }>(`SELECT "postId", "produtoId" FROM itens_de_post WHERE "postId" = ANY($1)`, [posts.map((post) => post.id)])).rows;
  const shortcodeSlugs = [...new Set(posts.flatMap((post) => referencedProducts(post.corpo)))];
  const products = (
    await source.query<SourceProduct>(
      `SELECT id, slug, plataforma::text, "idExterno", nome, descricao, imagens, "precoAtual"::text, "precoOriginal"::text, "linkAfiliado", "codigoCurto"
         FROM produtos WHERE slug = ANY($1) OR id = ANY($2)`,
      [shortcodeSlugs, [...new Set(itemRows.map((row) => row.produtoId))]],
    )
  ).rows;

  const mediaIds = new Set(posts.flatMap((post) => [post.capaId, post.audioId].filter((id): id is string => !!id)));
  const mediaUrls = new Set(posts.flatMap((post) => referencedImages(post.corpo).filter((url) => url.startsWith("/midia/"))));
  const larsmartRows = (
    await source.query<{ postId: string; midiaId: string; produtoId: string | null; tipo: string; prompt: string; pinterestTitulo: string | null; pinterestDescricao: string | null }>(
      `SELECT "postId", "midiaId", "produtoId", tipo::text, prompt, "pinterestTitulo", "pinterestDescricao" FROM imagens_larsmart WHERE "postId" = ANY($1)`,
      [posts.map((post) => post.id)],
    )
  ).rows;
  larsmartRows.forEach((row) => mediaIds.add(row.midiaId));
  const media = (await source.query<SourceMedia>(`SELECT id, url, caminho, "nomeOriginal", "mimeType", "tamanhoBytes", largura, altura, alt FROM midias WHERE id = ANY($1) OR url = ANY($2)`, [[...mediaIds], [...mediaUrls]])).rows;
  const notes = (await source.query<{ texto: string; categoriaEditorial: string | null; criadoEm: Date }>(`SELECT texto, "categoriaEditorial", "criadoEm" FROM notas_jornada ORDER BY "criadoEm"`)).rows;

  const byKind = posts.reduce<Record<string, number>>((acc, post) => ({ ...acc, [`${post.tipo}/${post.status}`]: (acc[`${post.tipo}/${post.status}`] ?? 0) + 1 }), {});
  console.log(`Origem: ${posts.length} posts ${JSON.stringify(byKind)}, ${products.length} produtos citados, ${media.length} mídias, ${notes.length} notas.`);
  if (others.length) console.log(`Ficam de fora (outros destinos): ${others.map((row) => `${row.destino}=${row.total}`).join(", ")}`);

  // --- Blog ---------------------------------------------------------------------
  let blog = await prisma.blog.findUnique({ where: { subdomain: "meunovolar" } });
  if (!blog && APPLY) {
    blog = await prisma.blog.create({
      data: {
        subdomain: "meunovolar",
        name: "Meu Novo Lar",
        tagline: "Casa e cotidiano: organização, cozinha, limpeza, decoração e a jornada do primeiro apartamento.",
        categories: ["HOME_TIPS", "APARTMENT_JOURNEY"],
        authorName: posts.find((post) => post.autor)?.autor ?? null,
      },
    });
  }
  console.log(blog ? `Blog "meunovolar" já existe (${blog.id}).` : "Blog \"meunovolar\" será criado.");
  // Página /sobre (o meunovolar.com/sobre e /equipe redirecionam para ela).
  if (blog && !blog.about && APPLY) {
    blog = await prisma.blog.update({ where: { id: blog.id }, data: { about: await loadBlogFile("meunovolar", "sobre.md") } });
  }

  // --- Mídia ----------------------------------------------------------------------
  const mediaIdMap = new Map<string, string>();
  for (const item of media) {
    const from = path.join(sourceMediaRoot, item.caminho);
    const exists = await stat(from).then(() => true, () => false);
    if (!exists) {
      report.mediaMissing.push(item.url);
      continue;
    }
    const relative = item.url.replace(/^\/midia\//, "");
    if (APPLY) {
      const to = path.join(mediaRoot(), relative);
      await mkdir(path.dirname(to), { recursive: true });
      if (!(await stat(to).then(() => true, () => false))) await copyFile(from, to);
      const saved = await prisma.media.upsert({
        where: { url: item.url },
        update: {},
        create: { url: item.url, path: relative, originalName: item.nomeOriginal, mimeType: item.mimeType, sizeBytes: item.tamanhoBytes, width: item.largura, height: item.altura, alt: item.alt },
      });
      mediaIdMap.set(item.id, saved.id);
    }
    report.media++;
  }

  // --- Produtos -------------------------------------------------------------------
  const slugMap = new Map<string, string>();
  const productIdMap = new Map<string, string>();
  const stores = await prisma.store.findMany({ where: { connector: { in: Object.values(CONNECTOR) } } });

  for (const item of products) {
    const connector = CONNECTOR[item.plataforma];
    const store = stores.find((candidate) => candidate.connector === connector);
    if (!store) {
      report.productsSkipped.push(`${item.slug} (${item.plataforma}: loja sem conector no Capibusca)`);
      continue;
    }
    const [sellerId, listingId] = item.plataforma === "SHOPEE" && item.idExterno.includes("_") ? item.idExterno.split("_") : [null, item.idExterno];
    const offer = await prisma.offer.findFirst({
      where: { storeId: store.id, externalListingId: listingId },
      select: { id: true, variant: { select: { product: { select: { id: true, slug: true } } } } },
    });

    let offerId: string | null = offer?.id ?? null;
    if (offer) {
      slugMap.set(item.slug, offer.variant.product.slug);
      productIdMap.set(item.id, offer.variant.product.id);
      report.productsMatched++;
    } else if (APPLY) {
      const name = item.nome.trim().slice(0, 140);
      const images = Array.isArray(item.imagens) ? (item.imagens as unknown[]).filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url)).slice(0, 6) : [];
      const product = await prisma.product.create({
        data: {
          name,
          slug: await uniqueProductSlug(name),
          summary: item.descricao?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600) || null,
          searchText: productSearchText({ name }),
          variants: { create: { label: "Padrão", isDefault: true } },
          images: { create: images.map((url, position) => ({ url, position, isCover: position === 0, source: "meu-novo-lar" })) },
        },
        include: { variants: true },
      });
      const created = await prisma.offer.create({
        data: {
          variantId: product.variants[0]!.id,
          storeId: store.id,
          sellerName: store.name,
          externalListingId: listingId,
          externalSellerId: sellerId,
          priceCents: cents(item.precoAtual),
          previousPriceCents: cents(item.precoOriginal),
          method: "API",
        },
      });
      offerId = created.id;
      slugMap.set(item.slug, product.slug);
      productIdMap.set(item.id, product.id);
      report.productsCreated++;
    } else {
      report.productsCreated++;
    }

    // Código /go antigo -> link de afiliado aqui (links já publicados continuam valendo).
    if (offerId && item.linkAfiliado.trim() && item.codigoCurto) {
      const taken = await prisma.affiliateLink.findUnique({ where: { shortCode: item.codigoCurto }, select: { offerId: true } });
      if (taken && taken.offerId !== offerId) report.goCodesTaken.push(item.codigoCurto);
      else if (!taken) {
        if (APPLY) await prisma.affiliateLink.create({ data: { offerId, url: item.linkAfiliado.trim(), shortCode: item.codigoCurto, label: "meu-novo-lar" } });
        report.goCodes++;
      }
    }
  }

  // --- Posts ----------------------------------------------------------------------
  const postIdMap = new Map<string, string>();
  for (const post of posts) {
    const body = post.corpo.replace(/^(\\?\[produto:)([a-z0-9-]+)(\])[ \t]*$/gm, (line, open: string, slug: string, close: string) => {
      const mapped = slugMap.get(slug);
      return mapped ? `${open.replace("\\", "")}${mapped}${close}` : line;
    });
    const existing = blog ? await prisma.post.findUnique({ where: { blogId_slug: { blogId: blog.id, slug: post.slug } }, select: { id: true } }) : null;
    if (existing && !OVERWRITE) {
      postIdMap.set(post.id, existing.id);
      report.postsSkipped++;
      continue;
    }
    report.posts++;
    if (!APPLY || !blog) continue;

    const data = {
      blogId: blog.id,
      kind: KIND[post.tipo] ?? "EDITORIAL",
      category: post.categoriaEditorial ? (CATEGORY[post.categoriaEditorial] ?? null) : null,
      title: post.titulo,
      slug: post.slug,
      summary: post.resumo,
      body,
      coverId: post.capaId ? (mediaIdMap.get(post.capaId) ?? null) : null,
      audioId: post.audioId ? (mediaIdMap.get(post.audioId) ?? null) : null,
      seoTitle: post.seoTitulo,
      metaDescription: post.metaDescricao,
      status: post.status === "PUBLICADO" ? ("PUBLISHED" as const) : ("DRAFT" as const),
      publishedAt: post.publicadoEm,
      safetyNotice: post.avisoSeguranca,
      authorName: post.autor,
      larsmartBrief: briefFrom(post.larsmartPauta),
      createdAt: post.criadoEm,
    };
    const saved = existing ? await prisma.post.update({ where: { id: existing.id }, data }) : await prisma.post.create({ data });
    postIdMap.set(post.id, saved.id);
    await syncPostRelations(saved.id, body);
  }

  // --- Imagens do LarSmart ----------------------------------------------------------
  for (const row of larsmartRows) {
    const postId = postIdMap.get(row.postId);
    const mediaId = mediaIdMap.get(row.midiaId);
    if (!APPLY || !postId || !mediaId) continue;
    const productId = row.produtoId ? (productIdMap.get(row.produtoId) ?? null) : null;
    const kind = row.tipo === "CAPA" ? ("COVER" as const) : ("PRODUCT" as const);
    const exists = await prisma.larSmartImage.findFirst({ where: { postId, productId, kind }, select: { id: true } });
    if (exists) continue;
    await prisma.larSmartImage.create({ data: { postId, mediaId, productId, kind, prompt: row.prompt, pinterestTitle: row.pinterestTitulo, pinterestDescription: row.pinterestDescricao } });
    report.larsmart++;
  }

  // --- Notas da jornada -------------------------------------------------------------
  for (const note of notes) {
    const category = note.categoriaEditorial ? CATEGORY[note.categoriaEditorial] : "APARTMENT_JOURNEY";
    if (!category || category.startsWith("SPIRITUAL")) {
      report.notesSkipped++;
      continue;
    }
    if (blog && (await prisma.journeyNote.findFirst({ where: { blogId: blog.id, text: note.texto }, select: { id: true } }))) continue;
    if (APPLY && blog) await prisma.journeyNote.create({ data: { blogId: blog.id, text: note.texto, category, createdAt: note.criadoEm } });
    report.notes++;
  }

  console.log("\nResumo");
  console.log(`- posts ${APPLY ? "gravados" : "a gravar"}: ${report.posts} (já existiam e foram pulados: ${report.postsSkipped})`);
  console.log(`- mídias: ${report.media}${report.mediaMissing.length ? ` · arquivos não encontrados na origem: ${report.mediaMissing.length}` : ""}`);
  console.log(`- produtos: ${report.productsMatched} casados com o catálogo, ${report.productsCreated} ${APPLY ? "criados" : "a criar"} em rascunho`);
  console.log(`- códigos /go preservados: ${report.goCodes}${report.goCodesTaken.length ? ` · já usados por outra oferta: ${report.goCodesTaken.join(", ")}` : ""}`);
  console.log(`- notas da jornada: ${report.notes} (espiritualidade, fora: ${report.notesSkipped}) · imagens LarSmart: ${report.larsmart}`);
  if (report.productsSkipped.length) console.log(`- produtos sem loja correspondente (card some do post):\n  ${report.productsSkipped.join("\n  ")}`);
  if (report.mediaMissing.length) console.log(`- mídias ausentes:\n  ${report.mediaMissing.slice(0, 30).join("\n  ")}`);
  if (APPLY && report.productsCreated) console.log("\nProdutos criados em RASCUNHO: revise e publique em /admin/produtos para os cards aparecerem nos posts.");

  await source.end();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
