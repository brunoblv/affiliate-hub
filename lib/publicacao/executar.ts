import { prisma } from "@/lib/database";
import { obterPublicador } from "./publicadores";
import { registrar } from "@/lib/log";
import { proximoHorarioLivre } from "@/lib/agenda/proximo-horario";

const MAX_TENTATIVAS = 4;
const ESPERA_MINIMA_ENTRE_TENTATIVAS_MIN = 10;

/**
 * Publica uma Publicacao já persistida (status PENDENTE ou PUBLICANDO) e
 * grava o resultado. Usado tanto pelo worker (fila) quanto pelo botão
 * "Publicar agora" (admin), para não duplicar a lógica de sucesso/falha.
 */
export async function executarPublicacao(publicacaoId: string): Promise<void> {
  const publicacao = await prisma.publicacao.findUniqueOrThrow({
    where: { id: publicacaoId },
    include: {
      canal: true,
      produto: { select: { slug: true } },
      post: { select: { slug: true } },
    },
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
      produto: publicacao.produto?.slug ?? publicacao.post?.slug,
      idExterno: resultado.idExterno,
    });
  } catch (erro) {
    await tratarFalha(publicacaoId, publicacao.canal, publicacao.tentativas, erro);
  }
}

/**
 * Falha não é terminal. Reagenda com espera até esgotar as tentativas — só aí
 * vira FALHOU e aparece no painel. Na v1 a primeira falha de rede matava o post
 * em silêncio.
 *
 * O reagendamento tem que respeitar os horários/teto/intervalo do canal — não
 * pode só somar minutos ao horário atual, senão o retry publica fora da janela
 * configurada (bug real: uma falha transitória fazia o post sair às 15h32 num
 * canal configurado só para 09:00/13:00/19:30).
 */
async function tratarFalha(
  publicacaoId: string,
  canal: Parameters<typeof proximoHorarioLivre>[0],
  tentativas: number,
  erro: unknown,
): Promise<void> {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const esgotou = tentativas >= MAX_TENTATIVAS;

  if (esgotou) {
    await prisma.publicacao.update({
      where: { id: publicacaoId },
      data: { status: "FALHOU", erro: mensagem },
    });
  } else {
    const apartirDe = new Date(Date.now() + ESPERA_MINIMA_ENTRE_TENTATIVAS_MIN * 60_000);
    const vaga = await proximoHorarioLivre(canal, apartirDe, publicacaoId);

    if (!vaga) {
      await prisma.publicacao.update({
        where: { id: publicacaoId },
        data: { status: "FALHOU", erro: `${mensagem} (sem horário livre para retentar)` },
      });
    } else {
      await prisma.publicacao.update({
        where: { id: publicacaoId },
        data: { status: "PENDENTE", erro: mensagem, agendadaPara: vaga.agendadaPara },
      });
    }
  }

  await registrar(
    "ERRO",
    "PUBLICACAO",
    esgotou ? "Publicação falhou em definitivo" : "Publicação falhou, vai tentar de novo",
    { publicacaoId, tentativas, erro: mensagem },
  );
}
