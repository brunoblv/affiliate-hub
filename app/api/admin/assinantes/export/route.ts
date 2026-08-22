import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export async function GET() {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const assinantes = await prisma.assinante.findMany({ orderBy: { criadoEm: "desc" } });

  const linhas = [
    "email,ativo,criadoEm",
    ...assinantes.map((a) => [escaparCsv(a.email), a.ativo ? "sim" : "nao", a.criadoEm.toISOString()].join(",")),
  ];

  return new NextResponse(linhas.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="assinantes.csv"`,
    },
  });
}
