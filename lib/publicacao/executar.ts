import { prisma } from "@/lib/database";
import { obterPublicador } from "./publicadores";
import { registrar } from "@/lib/log";

const MAX_TENTATIVAS = 4;
const ESPERA_ENTRE_TENTATIVAS_MIN = 10;

/**
 * Publica uma Publicacao já persistida (status PENDENTE ou PUBLICANDO) e
 * grava o resultado. Usado tanto pelo worker (fila) quanto pelo botão
 * "Publicar agora" (admin), para não duplicar a lógica de sucesso/falha.
 */
export async function executarPublicacao(publicacaoId: string): Promise<void> {
  const publicacao = await prisma.publicacao.findUniqueOrThrow({
    where: { id: publicacaoId },
    include: { canal: true, produto: { select: { slug: true } } },
  });

  try {
    const publicador = obterPublicador(publicacao.canal);

    const resultado = await publicador.publicar({
      texto: publicacao.texto,
      imagemUrl: publicacao.imagemUrl ?? undefined,
      link: publicacao.linkDestino,
    });

    await prisma.publicacao.update({
      where: { id: publicacaoId },
      data: {
        status: "PUBLICADA",
        publicadaEm: new Date(),
        idPostExterno: resultado.idExterno,
        erro: null,
      },
    });

    await registrar("INFO", "PUBLICACAO", `Publicado em ${publicacao.canal.nome}`, {
      produto: publicacao.produto.slug,
      idExterno: resultado.idExterno,
    });
  } catch (erro) {
    await tratarFalha(publicacaoId, publicacao.tentativas, erro);
  }
}

/**
 * Falha não é terminal. Reagenda com espera até esgotar as tentativas — só aí
 * vira FALHOU e aparece no painel. Na v1 a primeira falha de rede matava o post
 * em silêncio.
 */
async function tratarFalha(publicacaoId: string, tentativas: number, erro: unknown): Promise<void> {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const esgotou = tentativas >= MAX_TENTATIVAS;

  await prisma.publicacao.update({
    where: { id: publicacaoId },
    data: esgotou
      ? { status: "FALHOU", erro: mensagem }
      : {
          status: "PENDENTE",
          erro: mensagem,
          agendadaPara: new Date(Date.now() + ESPERA_ENTRE_TENTATIVAS_MIN * 60_000),
        },
  });

  await registrar(
    "ERRO",
    "PUBLICACAO",
    esgotou ? "Publicação falhou em definitivo" : "Publicação falhou, vai tentar de novo",
    { publicacaoId, tentativas, erro: mensagem },
  );
}
