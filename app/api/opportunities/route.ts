import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const opportunities = await prisma.opportunity.findMany({
    where: { status: "OPEN" },
    orderBy: { score: "desc" },
    take: 100,
    include: { product: true },
  });

  return NextResponse.json({ data: opportunities });
}
