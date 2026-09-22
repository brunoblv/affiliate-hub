import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getProductBySlug } from "@/lib/catalog";
import { isEligible } from "@/lib/pricing";
import { looksLikeImage } from "@/lib/images/check";
import { safeFetch, UnsafeUrlError } from "@/lib/net/safe-fetch";
import { deleteCreativeFile, saveCreativeFile } from "./storage";
import { FORMAT_KEYS, FORMATS, renderCreative, TEMPLATE, TEMPLATE_VERSION, type FormatKey } from "./render";

export type CreativeOutcome = { ok: true; created: number } | { ok: false; error: string };

export interface CreativeDeps {
  fetchPhoto: (url: string) => Promise<Buffer>;
  now: () => Date;
}

const defaultDeps: CreativeDeps = {
  fetchPhoto: async (url) => {
    const response = await safeFetch(url, { timeoutMs: 15_000, maxBytes: 10 * 1024 * 1024 });
    if (response.status !== 200 || !looksLikeImage(response.body)) throw new UnsafeUrlError("A foto do produto não pôde ser lida.");
    return response.body;
  },
  now: () => new Date(),
};

/**
 * Gera as capas nos 4 formatos a partir da FOTO REAL do produto. Com `withPrice`, usa o menor preço
 * elegível de agora, com a data da observação; sem oferta atual, recusa em vez de exibir preço velho.
 * Versões anteriores ainda não publicadas são substituídas (ficam no histórico como invalidadas).
 */
export async function generateCreatives(
  productId: string,
  options: { withPrice: boolean },
  overrides: Partial<CreativeDeps> = {},
): Promise<CreativeOutcome> {
  const deps = { ...defaultDeps, ...overrides };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      niches: { include: { niche: true } },
      images: { where: { broken: false }, orderBy: [{ isCover: "desc" }, { position: "asc" }] },
    },
  });
  if (!product) return { ok: false, error: "Produto não encontrado." };

  // Foto geral (sem variação) primeiro: a capa não pode representar uma variação só.
  const image = [...product.images].sort((a, b) => Number(a.variantId !== null) - Number(b.variantId !== null))[0];
  if (!image) return { ok: false, error: "Cadastre ao menos uma foto do produto (aba Imagens): a capa usa a foto real." };

  let price: { cents: number; observedAt: Date } | undefined;
  if (options.withPrice) {
    const published = await getProductBySlug(product.slug);
    const best = published?.offers.find(isEligible);
    if (!published || !best) {
      return { ok: false, error: "Sem oferta atual (ou produto não publicado): não dá para gerar capa com preço. Gere sem preço ou aguarde a coleta." };
    }
    price = { cents: best.priceCents, observedAt: new Date(deps.now().getTime() - best.collectedMinutesAgo * 60_000) };
  }

  let photo: Buffer;
  try {
    photo = await deps.fetchPhoto(image.url);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível baixar a foto." };
  }

  const niche = product.niches.map((item) => item.niche).filter((n) => n.active).sort((a, b) => a.position - b.position)[0];
  const created: { id: string; file: string; format: FormatKey }[] = [];

  try {
    for (const format of FORMAT_KEYS) {
      const jpeg = await renderCreative({ photo, name: product.name, brand: product.brand, nicheName: niche?.name ?? null, format, price });
      const id = randomUUID().replace(/-/g, "");
      const file = `${id}.jpg`;
      await saveCreativeFile(file, jpeg);
      created.push({ id, file, format });
    }
  } catch (error) {
    await Promise.all(created.map((item) => deleteCreativeFile(item.file)));
    return { ok: false, error: `Falha ao compor a capa: ${error instanceof Error ? error.message : String(error)}` };
  }

  await prisma.$transaction([
    prisma.creative.updateMany({
      where: { productId, withPrice: options.withPrice, status: { in: ["PENDING_APPROVAL", "APPROVED"] } },
      data: { status: "INVALIDATED", invalidatedReason: "Substituído por uma versão mais nova." },
    }),
    ...created.map((item) =>
      prisma.creative.create({
        data: {
          id: item.id,
          productId,
          format: item.format,
          template: TEMPLATE,
          templateVersion: TEMPLATE_VERSION,
          width: FORMATS[item.format].width,
          height: FORMATS[item.format].height,
          file: item.file,
          withPrice: options.withPrice,
          priceCents: price?.cents ?? null,
          priceObservedAt: price?.observedAt ?? null,
        },
      }),
    ),
  ]);
  return { ok: true, created: created.length };
}
