import { prisma } from "@/lib/database";
import { gerarCodigoCurto } from "@/lib/produtos";

export async function codigoCurtoLivre(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const codigo = gerarCodigoCurto();
    const [produto, lista] = await Promise.all([
      prisma.produto.findUnique({ where: { codigoCurto: codigo }, select: { id: true } }),
      prisma.listaOferta.findUnique({ where: { codigoCurto: codigo }, select: { id: true } }),
    ]);
    if (!produto && !lista) return codigo;
  }
  throw new Error("Não foi possível gerar um código curto único.");
}
