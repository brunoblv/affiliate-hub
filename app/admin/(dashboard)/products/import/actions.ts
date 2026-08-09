"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/database";
import { Platform, type Prisma } from "@/lib/generated/prisma/client";
import { parseCsv } from "@/lib/csv";
import { runScoringPipeline } from "@/lib/scoring";
import { logger } from "@/lib/logging";

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseDecimal(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const asIs = Number(value.trim());
  const parsed = Number.isFinite(asIs) ? asIs : Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  ignored: number;
  errors: ImportRowError[];
}

const REQUIRED_HEADERS = ["nome", "projeto", "preco"];

/**
 * Importação em massa de produtos via CSV (para cadastro manual do Mercado
 * Livre e outras plataformas sem API de busca disponível) — mesmo pipeline
 * Produto → Score → Oportunidade do cadastro manual unitário
 * (products/actions.ts createProductAction), mas em lote via arquivo.
 */
export async function importProductsAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo CSV.");
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error("Arquivo vazio ou sem linhas de dados.");
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      throw new Error(`Coluna obrigatória ausente no CSV: "${required}".`);
    }
  }

  const job = await prisma.job.create({
    data: { queue: "product-import", name: "Importação manual de produtos (CSV)", status: "RUNNING", startedAt: new Date() },
  });

  const summary: ImportSummary = { totalRows: rows.length - 1, created: 0, updated: 0, ignored: 0, errors: [] };

  try {
    const [projects, categories] = await Promise.all([
      prisma.affiliateProject.findMany({ select: { id: true, slug: true } }),
      prisma.category.findMany({ select: { id: true, name: true, projectId: true } }),
    ]);
    const projectBySlug = new Map(projects.map((p) => [p.slug, p.id]));
    const categoryByProjectAndName = new Map(
      categories.map((c) => [`${c.projectId}:${c.name.trim().toLowerCase()}`, c.id]),
    );

    for (let i = 1; i < rows.length; i++) {
      const rowNumber = i + 1;
      const cells = rows[i];
      const get = (key: string) => {
        const idx = headers.indexOf(key);
        return idx === -1 ? undefined : (cells[idx] ?? "").trim();
      };

      const nome = get("nome");
      if (!nome) {
        summary.ignored += 1;
        summary.errors.push({ row: rowNumber, message: "Coluna 'nome' vazia." });
        continue;
      }

      const projetoSlug = get("projeto");
      const projectId = projetoSlug ? projectBySlug.get(projetoSlug) : undefined;
      if (!projectId) {
        summary.ignored += 1;
        summary.errors.push({ row: rowNumber, message: `Projeto "${projetoSlug}" não encontrado.` });
        continue;
      }

      const price = parseDecimal(get("preco"));
      if (price === undefined) {
        summary.ignored += 1;
        summary.errors.push({ row: rowNumber, message: "Coluna 'preco' ausente ou inválida." });
        continue;
      }

      const platformRaw = (get("plataforma") ?? "").toUpperCase();
      const source = Object.values(Platform).includes(platformRaw as Platform) ? (platformRaw as Platform) : Platform.OUTRAS;

      const externalIdRaw = get("id_anuncio");
      const externalId = externalIdRaw || `manual-${toSlug(nome)}`;

      const categoriaNome = get("categoria");
      const categoryId = categoriaNome
        ? categoryByProjectAndName.get(`${projectId}:${categoriaNome.toLowerCase()}`)
        : undefined;
      if (categoriaNome && !categoryId) {
        summary.errors.push({ row: rowNumber, message: `Categoria "${categoriaNome}" não encontrada — produto salvo sem categoria.` });
      }

      const originalPrice = parseDecimal(get("preco_original"));
      const discountPercent =
        originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;

      const existing = await prisma.product.findUnique({
        where: { source_externalId: { source, externalId } },
        select: { id: true },
      });

      const slug = existing ? undefined : `${source.toLowerCase()}-${toSlug(externalId)}`;

      try {
        const product = await prisma.product.upsert({
          where: { source_externalId: { source, externalId } },
          create: {
            projectId,
            source,
            externalId,
            name: nome,
            slug: slug as string,
            description: get("descricao") || undefined,
            brand: get("marca") || undefined,
            categoryId,
            imageUrl: get("url_imagem") || undefined,
            productUrl: get("url_produto") || undefined,
            price,
            originalPrice,
            discountPercent,
            rating: parseDecimal(get("avaliacao")),
            reviewCount: parseDecimal(get("num_avaliacoes")),
            soldCount: parseDecimal(get("vendidos")),
            commissionPercent: parseDecimal(get("comissao_percent")),
          },
          update: {
            name: nome,
            description: get("descricao") || undefined,
            brand: get("marca") || undefined,
            categoryId,
            imageUrl: get("url_imagem") || undefined,
            productUrl: get("url_produto") || undefined,
            price,
            originalPrice,
            discountPercent,
            rating: parseDecimal(get("avaliacao")),
            reviewCount: parseDecimal(get("num_avaliacoes")),
            soldCount: parseDecimal(get("vendidos")),
            commissionPercent: parseDecimal(get("comissao_percent")),
          },
        });

        await runScoringPipeline(product.id, { isNew: !existing });

        if (existing) summary.updated += 1;
        else summary.created += 1;
      } catch (error) {
        summary.ignored += 1;
        summary.errors.push({ row: rowNumber, message: error instanceof Error ? error.message : String(error) });
      }
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", finishedAt: new Date(), result: summary as unknown as Prisma.InputJsonValue },
    });

    logger.info("PRODUCT_SYNC", "Importação manual de produtos concluída", summary);
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }

  redirect(`/admin/products/import?jobId=${job.id}`);
}
