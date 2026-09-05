import path from "node:path";
import { ZipArchive } from "archiver";
import { prisma } from "@/lib/database";
import { RAIZ_MIDIA } from "@/lib/midia/salvar";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 60;

function csvCampo(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** Baixa um ZIP com as imagens geradas pelo LarSmart pra esse post + um manifesto (título/descrição/alt/link rastreado) pra postar manualmente no Pinterest. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, imagens] = await Promise.all([
    prisma.post.findUnique({ where: { id }, select: { slug: true } }),
    prisma.imagemLarSmart.findMany({
      where: { postId: id },
      include: { midia: true, produto: { select: { nome: true, codigoCurto: true } } },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  if (!post) return new Response("Post não encontrado.", { status: 404 });
  if (imagens.length === 0) return new Response("Este post não tem imagens do LarSmart.", { status: 404 });

  const siteUrl = getSiteUrl();
  const linhas = ["arquivo,titulo,descricao,link_produto"];
  const arquivo = new ZipArchive({ zlib: { level: 9 } });

  for (const imagem of imagens) {
    const nomeArquivo = path.basename(imagem.midia.caminho);
    const caminhoAbsoluto = path.join(RAIZ_MIDIA, imagem.midia.caminho);
    arquivo.file(caminhoAbsoluto, { name: nomeArquivo });

    const link = imagem.produto ? `${siteUrl}/go/${imagem.produto.codigoCurto}` : "";
    linhas.push(
      [
        csvCampo(nomeArquivo),
        csvCampo(imagem.pinterestTitulo ?? imagem.produto?.nome ?? ""),
        csvCampo(imagem.pinterestDescricao ?? imagem.midia.alt ?? ""),
        csvCampo(link),
      ].join(","),
    );
  }

  arquivo.append(linhas.join("\n"), { name: "manifesto.csv" });
  void arquivo.finalize();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      arquivo.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      arquivo.on("end", () => controller.close());
      arquivo.on("error", (erro: Error) => controller.error(erro));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${post.slug}-pinterest.zip"`,
    },
  });
}
