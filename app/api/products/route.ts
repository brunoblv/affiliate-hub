import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { EntityStatus, type Prisma } from "@/lib/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const statusParam = searchParams.get("status");
  const status = statusParam && statusParam in EntityStatus ? (statusParam as EntityStatus) : undefined;

  const where: Prisma.ProductWhereInput = { categoryId, status };

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: products });
}
