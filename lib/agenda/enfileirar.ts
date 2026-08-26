import { prisma, Destino, Plataforma, Rede, StatusPost, TipoPost, type Canal, type Produto, type Post } from "@/lib/database";
import { produtoEmCooldown, proximoHorarioLivre } from "./proximo-horario";
import { montarTextoDoPost, montarTextoDaLista } from "@/lib/conteudo/texto-do-post";
import { garantirPostPublicadoDoProduto } from "@/lib/conteudo/post-do-produto";
import { executarPublicacao } from "@/lib/publicacao/executar";
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
  /** Só preenchido por publicarProdutoAgora: resultado real do envio imediato. */
  publicada?: boolean;
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

/**
 * Agenda a distribuição de um Post tipo LISTA (roundup de vários produtos)
 * nos canais ativos do seu Destino. Diferente de `enfileirarProduto`: não há
 * um link de afiliado único pra vários produtos de uma vez, então todo canal
 * — mesmo grupo do Telegram/WhatsApp, que normalmente pula o blog — aponta
 * pro post no blog, onde cada produto tem seu próprio link rastreado.
 *
 * Sem cooldown recorrente: uma Lista é conteúdo de um dia só, não "volta à
 * venda" como produto — por isso só pula um canal se já existe Publicacao
 * pra esse (postId, canalId), em vez de checar uma janela de dias.
 */
export async function enfileirarPost(postId: string, canalIds?: string[]): Promise<ResultadoEnfileiramento[]> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { capa: true } });

  if (!post) {
    return [pulado(postId, "Post", "Post não encontrado.")];
  }

  if (post.tipo !== TipoPost.LISTA) {
    return [pulado(post.id, post.titulo, "Só posts do tipo Lista podem ser distribuídos.")];
  }

  if (post.status !== StatusPost.PUBLICADO) {
    return [pulado(post.id, post.titulo, `Post "${post.slug}" ainda não está publicado.`)];
  }

  const canais = await prisma.canal.findMany({
    where: { ativo: true, destino: post.destino, ...(canalIds?.length ? { id: { in: canalIds } } : {}) },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[post.destino] ?? post.destino;
    return [
      pulado(
        post.destino,
        "Nenhum canal",
        `Nenhum canal ativo para o destino ${destino}. Cadastre ou ative um canal com o mesmo destino.`,
      ),
    ];
  }

  const resultados: ResultadoEnfileiramento[] = [];
  for (const canal of canais) {
    try {
      resultados.push(await enfileirarPostNoCanal(canal, post));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

async function enfileirarPostNoCanal(
  canal: Canal,
  post: Post & { capa: { url: string } | null },
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  const jaAgendado = await prisma.publicacao.findFirst({
    where: { canalId: canal.id, postId: post.id, status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] } },
    select: { id: true },
  });
  if (jaAgendado) {
    return { ...base, motivoPulado: "Essa lista já foi agendada/publicada neste canal." };
  }

  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/blog/${post.slug}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`;

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

  const texto = montarTextoDaLista({ post, rede: canal.rede, link });
  const chaveIdempotencia = `${post.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        postId: post.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl: post.capa?.url,
        linkDestino: link,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Lista agendada em ${canal.nome}`, {
      post: post.slug,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    return { ...base, agendadaPara: vaga.agendadaPara.toISOString(), publicacaoId: publicacao.id };
  } catch (erro) {
    if (isViolacaoIdempotencia(erro)) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}

/**
 * Publica um produto em um canal específico agora — ignora horários, teto
 * diário e intervalo mínimo do canal (só faz sentido para uma publicação
 * pontual disparada manualmente). Cooldown e idempotência continuam valendo:
 * ainda não se pode postar o mesmo produto duas vezes seguidas no mesmo canal.
 */
export async function publicarProdutoAgora(produtoId: string, canalId: string): Promise<ResultadoEnfileiramento> {
  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) return pulado(produtoId, "Produto", "Produto não encontrado.");
  if (!produto.ativo) return pulado(produto.id, produto.nome, `Produto "${produto.slug}" está inativo.`);

  const canal = await prisma.canal.findUnique({ where: { id: canalId } });
  if (!canal) return pulado(canalId, "Canal", "Canal não encontrado.");
  if (!canal.ativo) return pulado(canal.id, canal.nome, "Canal está inativo.");
  if (canal.destino !== produto.destino) {
    return pulado(
      canal.id,
      canal.nome,
      `Canal é do destino ${LABEL_DESTINO[canal.destino]}, produto é do destino ${LABEL_DESTINO[produto.destino]}.`,
    );
  }

  let slugDoPost: string;
  try {
    slugDoPost = (await garantirPostPublicadoDoProduto(produto)).slug;
  } catch (erro) {
    return pulado(produto.id, produto.nome, mensagemErro(erro));
  }

  if (await produtoEmCooldown(canal, produto.id)) {
    return pulado(canal.id, canal.nome, `Já publicado neste canal nos últimos ${canal.cooldownDias} dias`);
  }

  let link: string;
  try {
    link = linkDestino(canal, produto, slugDoPost);
  } catch (erro) {
    return pulado(canal.id, canal.nome, mensagemErro(erro));
  }

  const texto = montarTextoDoPost({ produto, rede: canal.rede, link });
  const agora = new Date();
  const chaveIdempotencia = `${produto.id}:${canal.id}:${agora.toISOString()}`;

  let publicacaoId: string;
  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        produtoId: produto.id,
        canalId: canal.id,
        agendadaPara: agora,
        texto,
        imagemUrl: primeiraImagem(produto),
        linkDestino: link,
        chaveIdempotencia,
      },
    });
    publicacaoId = publicacao.id;
  } catch (erro) {
    if (isViolacaoIdempotencia(erro)) {
      return pulado(canal.id, canal.nome, "Slot já reservado por outro agendamento");
    }
    throw erro;
  }

  await executarPublicacao(publicacaoId);

  const resultado = await prisma.publicacao.findUniqueOrThrow({ where: { id: publicacaoId } });

  return {
    canalId: canal.id,
    canal: canal.nome,
    publicacaoId,
    agendadaPara: agora.toISOString(),
    publicada: resultado.status === "PUBLICADA",
    motivoPulado: resultado.status === "PUBLICADA" ? undefined : (resultado.erro ?? "Falha ao publicar."),
  };
}
