import { prisma, Destino, Plataforma, Rede, StatusPost, TipoPost, type Canal, type Produto, type Post } from "@/lib/database";
import { produtoEmCooldown, proximoHorarioLivre } from "./proximo-horario";
import { proximoMeioDiaLivre } from "./meio-dia";
import { gerarLegendaDaLista, gerarLegendaDoProduto, gerarLegendaDaJornada } from "@/lib/conteudo/gerar-legenda";
import { montarTextoDaJornada } from "@/lib/conteudo/texto-do-post";
import { executarPublicacao } from "@/lib/publicacao/executar";
import { registrar } from "@/lib/log";
import { getSiteUrl, urlPublica } from "@/lib/site-url";
import { CAPA_EDITORIAL } from "@/lib/conteudo/capa";
import { gerarImagemDePublicacao } from "@/lib/artes";
import { reais } from "@/lib/vitrine/rotulos";

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

/** Link da loja com tag de afiliado — posts de produto não passam pelo site. */
function linkAfiliadoDoProduto(produto: Produto): string {
  const link = produto.linkAfiliado.trim();
  if (!link) {
    throw new Error(
      `Produto "${produto.slug}" não tem link de afiliado — não publica sem comissão.`,
    );
  }
  return link;
}

/** Primeira imagem do produto, ou undefined se a API não trouxe nenhuma. */
function primeiraImagem(produto: Produto): string | undefined {
  const imagens = (produto.imagens as unknown as string[]) ?? [];
  return imagens[0];
}

/**
 * Compõe a arte quadrada do produto (fundo + foto + título/preço). Cai de
 * volta para a foto crua do marketplace se o fundo do tipo "produto" ainda
 * não existir em public/fundos-posts/ ou se a composição falhar por
 * qualquer motivo — nunca trava o agendamento por causa da arte.
 */
async function imagemDoProduto(produto: Produto): Promise<string | undefined> {
  const fotoCrua = primeiraImagem(produto);
  try {
    const precoAtual = reais(produto.precoAtual);
    const precoOriginal =
      produto.precoOriginal && Number(produto.precoOriginal) > Number(produto.precoAtual)
        ? reais(produto.precoOriginal)
        : null;
    const url = await gerarImagemDePublicacao({
      tipo: "produto",
      semente: produto.id,
      titulo: produto.nome,
      fotoUrl: fotoCrua ?? null,
      precoAtual,
      precoOriginal,
    });
    if (url) return urlPublica(url);
  } catch (erro) {
    await registrar("ERRO", "ARTES", "Falha ao compor arte do produto — publicando com a foto crua.", {
      produto: produto.slug,
      erro: mensagemErro(erro),
    });
  }
  return fotoCrua;
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

  const imagemUrl = await imagemDoProduto(produto);

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
      const resultado = await enfileirarNoCanal(canal, produto, imagemUrl);
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
  imagemUrl: string | undefined,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  if (await produtoEmCooldown(canal, produto.id)) {
    return { ...base, motivoPulado: `Já publicado neste canal nos últimos ${canal.cooldownDias} dias` };
  }

  let link: string;
  try {
    link = linkAfiliadoDoProduto(produto);
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
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min, ${pendentes} na fila). Aumente o teto do canal.`,
    };
  }

  const texto = await gerarLegendaDoProduto({ produto, rede: canal.rede, link });

  const chaveIdempotencia = `${produto.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        produtoId: produto.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl,
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
 * aponta pro post no blog, onde cada produto tem seu próprio link rastreado.
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

  const imagemUrl = await imagemDaLista(post);

  const resultados: ResultadoEnfileiramento[] = [];
  for (const canal of canais) {
    try {
      resultados.push(await enfileirarPostNoCanal(canal, post, imagemUrl));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

/**
 * Compõe a arte quadrada da lista (fundo + capa + título do roundup). Cai de
 * volta para a capa manual crua se o fundo do tipo "lista" ainda não existir
 * ou se a composição falhar.
 */
async function imagemDaLista(post: Post & { capa: { url: string } | null }): Promise<string | undefined> {
  const capaCrua = urlPublica(post.capa?.url);
  try {
    const url = await gerarImagemDePublicacao({
      tipo: "lista",
      semente: post.id,
      titulo: post.titulo,
      fotoUrl: post.capa?.url ?? null,
    });
    if (url) return urlPublica(url);
  } catch (erro) {
    await registrar("ERRO", "ARTES", "Falha ao compor arte da lista — publicando com a capa crua.", {
      post: post.slug,
      erro: mensagemErro(erro),
    });
  }
  return capaCrua;
}

async function enfileirarPostNoCanal(
  canal: Canal,
  post: Post & { capa: { url: string } | null },
  imagemUrl: string | undefined,
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
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min, ${pendentes} na fila). Aumente o teto do canal.`,
    };
  }

  const texto = await gerarLegendaDaLista({ post, rede: canal.rede, link });
  const chaveIdempotencia = `${post.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        postId: post.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl,
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

const REDES_JORNADA = [Rede.FACEBOOK_PAGE, Rede.INSTAGRAM] as const;

/**
 * Compõe a arte quadrada da jornada (fundo + foto/hero + título do artigo).
 * Cai de volta para a capa/hero crua se o fundo do tipo "jornada" ainda não
 * existir ou se a composição falhar.
 */
async function imagemDaJornada(post: Post & { capa: { url: string } | null }): Promise<string | undefined> {
  const fotoUrl = post.capa?.url ?? CAPA_EDITORIAL.src;
  const bruta = urlPublica(post.capa?.url) ?? urlPublica(CAPA_EDITORIAL.src);
  try {
    const url = await gerarImagemDePublicacao({
      tipo: "jornada",
      semente: post.id,
      titulo: post.titulo,
      fotoUrl,
    });
    if (url) return urlPublica(url);
  } catch (erro) {
    await registrar("ERRO", "ARTES", "Falha ao compor arte da jornada — publicando com a capa crua.", {
      post: post.slug,
      erro: mensagemErro(erro),
    });
  }
  return bruta;
}

/**
 * Agenda um artigo de jornada no Facebook (página) e no Instagram do mesmo
 * Destino. Sempre às 12h (Brasília) no próximo dia sem matéria de jornada
 * naquele canal. A legenda aponta para o post no blog.
 */
export async function enfileirarJornada(
  postId: string,
  canalIds?: string[],
  opcoes?: { template?: boolean },
): Promise<ResultadoEnfileiramento[]> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { capa: true } });

  if (!post) {
    return [pulado(postId, "Post", "Post não encontrado.")];
  }

  if (post.tipo !== TipoPost.JORNADA) {
    return [pulado(post.id, post.titulo, "Só posts do tipo Jornada entram neste agendamento.")];
  }

  if (post.status !== StatusPost.PUBLICADO) {
    return [pulado(post.id, post.titulo, `Post "${post.slug}" ainda não está publicado.`)];
  }

  const canais = await prisma.canal.findMany({
    where: {
      ativo: true,
      destino: post.destino,
      rede: { in: [...REDES_JORNADA] },
      ...(canalIds?.length ? { id: { in: canalIds } } : {}),
    },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[post.destino] ?? post.destino;
    return [
      pulado(
        post.destino,
        "Nenhum canal",
        `Nenhum Facebook (página) ou Instagram ativo para ${destino}. Cadastre os canais do Meu Novo Lar.`,
      ),
    ];
  }

  const resultados: ResultadoEnfileiramento[] = [];
  for (const canal of canais) {
    try {
      resultados.push(await enfileirarJornadaNoCanal(canal, post, opcoes?.template === true));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

async function enfileirarJornadaNoCanal(
  canal: Canal,
  post: Post & { capa: { url: string } | null },
  usarTemplate: boolean,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };

  const jaAgendado = await prisma.publicacao.findFirst({
    where: { canalId: canal.id, postId: post.id, status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] } },
    select: { id: true },
  });
  if (jaAgendado) {
    return { ...base, motivoPulado: "Essa matéria já foi agendada/publicada neste canal." };
  }

  const imagemUrl = canal.rede === Rede.INSTAGRAM ? await imagemDaJornada(post) : undefined;
  if (canal.rede === Rede.INSTAGRAM && !imagemUrl) {
    return { ...base, motivoPulado: "Instagram exige imagem — envie uma capa no post." };
  }

  const siteUrl = getSiteUrl();
  const link = `${siteUrl}/blog/${post.slug}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`;

  let vaga: Date | null;
  try {
    vaga = await proximoMeioDiaLivre(canal);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  if (!vaga) {
    return {
      ...base,
      motivoPulado: "Sem dia vazio às 12h (Brasília) nos próximos 90 dias — já há jornada ou o horário está ocupado.",
    };
  }

  const texto = usarTemplate
    ? montarTextoDaJornada({ post, rede: canal.rede, link })
    : await gerarLegendaDaJornada({ post, rede: canal.rede, link });
  const chaveIdempotencia = `${post.id}:${canal.id}:${vaga.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        postId: post.id,
        canalId: canal.id,
        agendadaPara: vaga,
        texto,
        // Facebook: sem foto, para o Graph publicar no /feed com preview do artigo.
        // Instagram: arte composta (ou capa/hero crua) — a API exige imagem.
        imagemUrl: imagemUrl ?? null,
        linkDestino: link,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Jornada agendada em ${canal.nome} às 12h`, {
      post: post.slug,
      agendadaPara: vaga.toISOString(),
    });

    return { ...base, agendadaPara: vaga.toISOString(), publicacaoId: publicacao.id };
  } catch (erro) {
    if (isViolacaoIdempotencia(erro)) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}

export interface ResultadoDistribuicaoDePost {
  postId: string;
  post: string;
  resultados: ResultadoEnfileiramento[];
}

const LIMITE_JORNADAS_DIAS_VAZIOS = 90;

/**
 * Preenche dias sem matéria de jornada às 12h (Brasília) no Facebook (página)
 * e no Instagram do Meu Novo Lar, com artigos JORNADA publicados que ainda
 * não entraram na fila daquele canal.
 */
export async function enfileirarJornadasNosDiasVazios(): Promise<ResultadoDistribuicaoDePost[]> {
  const posts = await prisma.post.findMany({
    where: { tipo: TipoPost.JORNADA, status: StatusPost.PUBLICADO },
    orderBy: { publicadoEm: "asc" },
    take: LIMITE_JORNADAS_DIAS_VAZIOS,
    select: { id: true, titulo: true },
  });

  const saida: ResultadoDistribuicaoDePost[] = [];

  for (const post of posts) {
    try {
      const resultados = await enfileirarJornada(post.id, undefined, { template: true });
      const agendou = resultados.some((r) => r.agendadaPara);
      const soJaAgendado =
        !agendou &&
        resultados.every((r) => r.motivoPulado === "Essa matéria já foi agendada/publicada neste canal.");
      if (soJaAgendado) continue;
      saida.push({ postId: post.id, post: post.titulo, resultados });
    } catch (erro) {
      saida.push({
        postId: post.id,
        post: post.titulo,
        resultados: [pulado("erro", "Agendamento", mensagemErro(erro))],
      });
    }
  }

  return saida;
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

  if (await produtoEmCooldown(canal, produto.id)) {
    return pulado(canal.id, canal.nome, `Já publicado neste canal nos últimos ${canal.cooldownDias} dias`);
  }

  let link: string;
  try {
    link = linkAfiliadoDoProduto(produto);
  } catch (erro) {
    return pulado(canal.id, canal.nome, mensagemErro(erro));
  }

  const texto = await gerarLegendaDoProduto({ produto, rede: canal.rede, link });
  const imagemUrl = await imagemDoProduto(produto);
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
        imagemUrl,
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
