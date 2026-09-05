import { prisma, type ContentType } from "@/lib/database";

/**
 * Regra 5 / critério de aceite de docs/hub/regras-postagem-facebook.md:
 * "média de visualizações por content_type nos últimos 30 dias" — via query,
 * sem precisar analisar manualmente.
 */
export interface MediaPorContentType {
  contentType: ContentType;
  posts: number;
  mediaVisualizacoes: number | null;
  mediaVisualizadoresUnicos: number | null;
  mediaEngajamentos: number | null;
}

export async function mediaPorContentType(
  canalId: string,
  dias = 30,
  referencia: Date = new Date(),
): Promise<MediaPorContentType[]> {
  const desde = new Date(referencia.getTime() - dias * 24 * 60 * 60 * 1000);

  const linhas = await prisma.publicacao.groupBy({
    by: ["contentType"],
    where: { canalId, status: "PUBLICADA", publicadaEm: { gte: desde, lte: referencia } },
    _count: { _all: true },
    _avg: { visualizacoes: true, visualizadoresUnicos: true, engajamentos: true },
  });

  return linhas.map((linha) => ({
    contentType: linha.contentType,
    posts: linha._count._all,
    mediaVisualizacoes: linha._avg.visualizacoes,
    mediaVisualizadoresUnicos: linha._avg.visualizadoresUnicos,
    mediaEngajamentos: linha._avg.engajamentos,
  }));
}
