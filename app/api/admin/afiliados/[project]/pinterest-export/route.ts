import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { buildPinterestBulkCsv, type PinterestExportProduct } from "@/lib/pinterest/bulk-csv";
import { Channel } from "@/lib/generated/prisma/client";

/**
 * Exporta produtos do projeto no CSV de bulk upload do Pinterest — só
 * produtos com link de afiliado real (nunca a URL crua da loja).
 * Query: ?board=NomeDoBoard&status=ACTIVE
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ project: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { project: slug } = await context.params;
  const project = await prisma.affiliateProject.findUnique({ where: { slug } });
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const board = searchParams.get("board")?.trim() ?? "";
  if (!board) {
    return NextResponse.json({ error: "Parâmetro board é obrigatório." }, { status: 400 });
  }

  const status = searchParams.get("status")?.trim();
  const publishDate = searchParams.get("publishDate")?.trim() || undefined;

  const products = await prisma.product.findMany({
    where: {
      projectId: project.id,
      ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED" } : { status: "ACTIVE" }),
    },
    include: {
      category: { select: { name: true } },
      affiliateLinks: {
        orderBy: { createdAt: "desc" },
        select: { shortCode: true, channel: true, affiliateUrl: true },
      },
      sources: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { affiliateUrl: true, externalUrl: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const mapped: PinterestExportProduct[] = products.map((p) => {
    const pinterestLink = p.affiliateLinks.find((l) => l.channel === Channel.PINTEREST);
    const anyLink = pinterestLink ?? p.affiliateLinks[0] ?? null;
    const source = p.sources[0];

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      brand: p.brand,
      categoryName: p.category?.name ?? null,
      trackingShortCode: anyLink?.shortCode ?? null,
      // Nunca cai pra source.externalUrl/product.productUrl — link sem afiliado não pode ser exportado.
      affiliateOrProductUrl: anyLink?.affiliateUrl ?? source?.affiliateUrl ?? null,
    };
  });

  // Sempre exclui produtos sem link de afiliado real — nunca exporta URL crua da loja.
  const eligible = mapped.filter((p) => Boolean(p.trackingShortCode || p.affiliateOrProductUrl));

  try {
    const { csv, exported, skipped } = buildPinterestBulkCsv(eligible, { board, publishDate });
    const filename = `pinterest-${project.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Exported-Count": String(exported),
        "X-Skipped-Count": String(skipped),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
