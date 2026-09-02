import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/database";

// Rota sem segmento dinâmico — sem isso o Next pode otimizar a resposta como
// estática no build e travar o redirecionamento sempre no mesmo artigo.
export const dynamic = "force-dynamic";

/**
 * Link fixo pro "link da bio" do Instagram/Facebook — a API dessas redes não
 * permite trocar o link da bio por código, então a bio aponta pra esta URL
 * uma única vez e o redirecionamento decide pra onde vai a cada clique:
 * sempre o artigo/lista publicado mais recentemente.
 */
export async function GET(request: NextRequest) {
  const post = await prisma.post.findFirst({
    where: { status: "PUBLICADO", tipo: { in: ["JORNADA", "LISTA"] } },
    orderBy: { publicadoEm: "desc" },
    select: { slug: true },
  });

  const caminho = post ? `/blog/${post.slug}` : "/blog";
  const destino = new URL(caminho, request.url);
  destino.searchParams.set("utm_source", "link_na_bio");
  destino.searchParams.set("utm_medium", "social");

  return NextResponse.redirect(destino, { status: 302 });
}
