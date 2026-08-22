import { prisma } from "@/lib/database";
import { Rede, type Canal, type Produto } from "@/lib/generated/prisma/client";
import { produtoEmCooldown, proximoHorarioLivre } from "@/lib/agenda/proximo-horario";
import { montarTextoDoPost } from "@/lib/conteudo/texto-do-post";
import { registrar } from "@/lib/log";

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Redes que levam para o blog (§2 da spec): o visitante vê o conteúdo e os
 * anúncios antes de sair. Telegram recebe o link rastreado direto, porque ali
 * o público é de oferta e um intermediário derruba a conversão.
 */
const REDES_QUE_APONTAM_PARA_O_BLOG = new Set<Rede>([Rede.FACEBOOK_PAGE, Rede.INSTAGRAM]);

export interface ResultadoEnfileiramento {
  canalId: string;
  canal: string;
  agendadaPara?: Date;
  publicacaoId?: string;
  motivoPulado?: string;
}

function linkDestino(rede: Rede, produto: Produto, slugDoPost: string | null): string {
  if (REDES_QUE_APONTAM_PARA_O_BLOG.has(rede)) {
    if (!slugDoPost) {
      throw new Error(
        `Produto "${produto.slug}" não tem post publicado no blog — ${rede} só publica com link do site.`,
      );
    }
    const origem = rede === Rede.FACEBOOK_PAGE ? "facebook" : "instagram";
    return `${URL_SITE}/blog/${slugDoPost}?utm_source=${origem}&utm_medium=social`;
  }

  return `${URL_SITE}/go/${produto.codigoCurto}?o=telegram`;
}

/** Primeira imagem do produto, ou undefined se a API não trouxe nenhuma. */
function primeiraImagem(produto: Produto): string | undefined {
  const imagens = (produto.imagens as unknown as string[]) ?? [];
  return imagens[0];
}

/**
 * Agenda a distribuição de um produto nos canais ativos.
 *
 * Diferente da v1: a publicação nasce PENDENTE e PENDENTE publica. Não existe
 * etapa de aprovação — era ela que deixava tudo parado em silêncio.
 */
export async function enfileirarProduto(produtoId: string, canalIds?: string[]): Promise<ResultadoEnfileiramento[]> {
  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId },
    include: {
      itens: {
        where: { post: { status: "PUBLICADO" } },
        include: { post: { select: { slug: true, publicadoEm: true } } },
        orderBy: { post: { publicadoEm: "desc" } },
        take: 1,
      },
    },
  });

  if (!produto.ativo) {
    throw new Error(`Produto "${produto.slug}" está inativo.`);
  }

  const slugDoPost = produto.itens[0]?.post.slug ?? null;

  const canais = await prisma.canal.findMany({
    where: { ativo: true, ...(canalIds?.length ? { id: { in: canalIds } } : {}) },
  });

  const resultados: ResultadoEnfileiramento[] = [];

  for (const canal of canais) {
    const resultado = await enfileirarNoCanal(canal, produto, slugDoPost);
    resultados.push(resultado);
  }

  return resultados;
}

async function enfileirarNoCanal(
  canal: Canal,
  produto: Produto,
  slugDoPost: string | null,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  if (await produtoEmCooldown(canal, produto.id)) {
    return { ...base, motivoPulado: `Já publicado neste canal nos últimos ${canal.cooldownDias} dias` };
  }

  let destino: string;
  try {
    destino = linkDestino(canal.rede, produto, slugDoPost);
  } catch (erro) {
    return { ...base, motivoPulado: erro instanceof Error ? erro.message : String(erro) };
  }

  const vaga = await proximoHorarioLivre(canal);

  if (!vaga) {
    return { ...base, motivoPulado: "Sem horário livre nos próximos 30 dias" };
  }

  const texto = montarTextoDoPost({ produto, rede: canal.rede, link: destino });

  const chaveIdempotencia = `${produto.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        produtoId: produto.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl: primeiraImagem(produto),
        linkDestino: destino,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Publicação agendada em ${canal.nome}`, {
      produto: produto.slug,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    return { ...base, agendadaPara: vaga.agendadaPara, publicacaoId: publicacao.id };
  } catch (erro) {
    // Violação da unique de chaveIdempotencia = outra requisição já agendou
    // exatamente este slot. Não é erro, é a proteção funcionando.
    if (erro instanceof Error && erro.message.includes("chaveIdempotencia")) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}
