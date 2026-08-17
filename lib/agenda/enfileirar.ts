import { prisma, Destino, Plataforma, Rede, type Canal, type Produto } from "@/lib/database";
import { produtoEmCooldown, proximoHorarioLivre } from "./proximo-horario";
import { montarTextoDoPost } from "@/lib/conteudo/texto-do-post";
import { garantirPostPublicadoDoProduto } from "@/lib/conteudo/post-do-produto";
import { registrar } from "@/lib/log";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Redes que levam para o blog (§2 da spec): o visitante vê o conteúdo e os
 * anúncios antes de sair. Grupos (Telegram, WhatsApp, grupo do Facebook)
 * recebem o link rastreado direto, porque ali o público é de oferta e um
 * intermediário derruba a conversão. Destino UMBANDA não tem post no blog —
 * vai sempre direto, mesmo na Página do Facebook.
 */
const REDES_QUE_APONTAM_PARA_O_BLOG = new Set<Rede>([Rede.FACEBOOK_PAGE, Rede.INSTAGRAM]);

const ORIGEM_POR_REDE: Record<Rede, string> = {
  [Rede.FACEBOOK_PAGE]: "facebook",
  [Rede.FACEBOOK_GROUP]: "facebook-grupo",
  [Rede.INSTAGRAM]: "instagram",
  [Rede.TELEGRAM]: "telegram",
  [Rede.WHATSAPP]: "whatsapp",
};

const LABEL_DESTINO: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]: "Meu Novo Lar",
  [Destino.TIKTOK_SHOP]: "TikTok Shop",
  [Destino.UMBANDA]: "Umbanda",
};

export interface ResultadoEnfileiramento {
  canalId: string;
  canal: string;
  /** ISO 8601 — string para atravessar a fronteira da Server Action sem Date. */
  agendadaPara?: string;
  publicacaoId?: string;
  motivoPulado?: string;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function isViolacaoIdempotencia(erro: unknown): boolean {
  if (!erro || typeof erro !== "object") return false;
  const code = "code" in erro ? String(erro.code) : "";
  const message = mensagemErro(erro);
  const target = "meta" in erro && erro.meta && typeof erro.meta === "object" && "target" in erro.meta
    ? String(erro.meta.target)
    : "";
  return code === "P2002" || message.includes("chaveIdempotencia") || target.includes("chaveIdempotencia");
}

function linkDestino(canal: Canal, produto: Produto, slugDoPost: string | null): string {
  const siteUrl = getSiteUrl();
  const apontaParaBlog = produto.destino !== Destino.UMBANDA && REDES_QUE_APONTAM_PARA_O_BLOG.has(canal.rede);

  if (apontaParaBlog) {
    if (!slugDoPost) {
      throw new Error(
        `Produto "${produto.slug}" não tem post publicado no blog — ${canal.rede} só publica com link do site.`,
      );
    }
    return `${siteUrl}/blog/${slugDoPost}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`;
  }

  return `${siteUrl}/go/${produto.codigoCurto}?o=${ORIGEM_POR_REDE[canal.rede]}`;
}

/** Primeira imagem do produto, ou undefined se a API não trouxe nenhuma. */
function primeiraImagem(produto: Produto): string | undefined {
  const imagens = (produto.imagens as unknown as string[]) ?? [];
  return imagens[0];
}

function pulado(canalId: string, canal: string, motivoPulado: string): ResultadoEnfileiramento {
  return { canalId, canal, motivoPulado };
}

/** Achadinhos do TikTok Shop são one-shot: um post e não volta. */
function ehProdutoTikTok(produto: Produto): boolean {
  return produto.destino === Destino.TIKTOK_SHOP || produto.plataforma === Plataforma.TIKTOK_SHOP;
}

/**
 * Agenda a distribuição de um produto nos canais ativos.
 *
 * A publicação nasce PENDENTE e PENDENTE publica — não existe etapa de
 * aprovação em duas fases, essa foi a trava em silêncio da v1.
 *
 * Nunca lança: cada canal (ou a ausência deles) vira um resultado, para o
 * botão da admin sempre ter o que mostrar.
 */
export async function enfileirarProduto(produtoId: string, canalIds?: string[]): Promise<ResultadoEnfileiramento[]> {
  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });

  if (!produto) {
    return [pulado(produtoId, "Produto", "Produto não encontrado.")];
  }

  if (!produto.ativo) {
    return [pulado(produto.id, produto.nome, `Produto "${produto.slug}" está inativo.`)];
  }

  let slugDoPost: string;
  try {
    slugDoPost = (await garantirPostPublicadoDoProduto(produto)).slug;
  } catch (erro) {
    return [pulado(produto.id, produto.nome, mensagemErro(erro))];
  }

  const canais = await prisma.canal.findMany({
    where: { ativo: true, destino: produto.destino, ...(canalIds?.length ? { id: { in: canalIds } } : {}) },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[produto.destino] ?? produto.destino;
    return [
      pulado(
        produto.destino,
        "Nenhum canal",
        `Nenhum canal ativo para o destino ${destino}. Cadastre ou ative um canal com o mesmo destino.`,
      ),
    ];
  }

  if (ehProdutoTikTok(produto)) {
    const ORDEM_REDE: Record<Rede, number> = {
      [Rede.FACEBOOK_PAGE]: 0,
      [Rede.INSTAGRAM]: 1,
      [Rede.FACEBOOK_GROUP]: 2,
      [Rede.TELEGRAM]: 3,
      [Rede.WHATSAPP]: 4,
    };
    canais.sort((a, b) => ORDEM_REDE[a.rede] - ORDEM_REDE[b.rede] || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[produto.destino] ?? produto.destino;
    return [
      pulado(
        produto.destino,
        "Nenhum canal",
        `Nenhum canal ativo para o destino ${destino}. Cadastre ou ative um canal com o mesmo destino.`,
      ),
    ];
  }

  if (ehProdutoTikTok(produto)) {
    const jaPostou = await prisma.publicacao.findFirst({
      where: {
        produtoId: produto.id,
        status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      },
      include: { canal: { select: { nome: true } } },
      orderBy: { agendadaPara: "asc" },
    });

    if (jaPostou) {
      return [
        pulado(
          jaPostou.canalId,
          jaPostou.canal.nome,
          `Produto TikTok Shop já foi agendado em ${jaPostou.canal.nome} — publica só uma vez.`,
        ),
      ];
    }
  }

  const resultados: ResultadoEnfileiramento[] = [];
  let agendadoTikTokEm: string | null = null;

  for (const canal of canais) {
    if (agendadoTikTokEm) {
      resultados.push(
        pulado(canal.id, canal.nome, `Produto TikTok Shop publica só uma vez — já agendado em ${agendadoTikTokEm}.`),
      );
      continue;
    }

    try {
      const resultado = await enfileirarNoCanal(canal, produto, slugDoPost);
      resultados.push(resultado);
      if (ehProdutoTikTok(produto) && resultado.agendadaPara) {
        agendadoTikTokEm = canal.nome;
      }
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

async function enfileirarNoCanal(
  canal: Canal,
  produto: Produto,
  slugDoPost: string,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  if (await produtoEmCooldown(canal, produto.id)) {
    return { ...base, motivoPulado: `Já publicado neste canal nos últimos ${canal.cooldownDias} dias` };
  }

  let link: string;
  try {
    link = linkDestino(canal, produto, slugDoPost);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  let vaga;
  try {
    vaga = await proximoHorarioLivre(canal);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  if (!vaga) {
    const pendentes = await prisma.publicacao.count({
      where: { canalId: canal.id, status: { in: ["PENDENTE", "PUBLICANDO"] } },
    });
    return {
      ...base,
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min, ${pendentes} na fila). Aumente o teto ou os horários do canal.`,
    };
  }

  const texto = montarTextoDoPost({ produto, rede: canal.rede, link });

  const chaveIdempotencia = `${produto.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        produtoId: produto.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl: primeiraImagem(produto),
        linkDestino: link,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Publicação agendada em ${canal.nome}`, {
      produto: produto.slug,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    return { ...base, agendadaPara: vaga.agendadaPara.toISOString(), publicacaoId: publicacao.id };
  } catch (erro) {
    // Violação da unique de chaveIdempotencia = outra requisição já agendou
    // exatamente este slot. Não é erro, é a proteção funcionando.
    if (isViolacaoIdempotencia(erro)) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}
