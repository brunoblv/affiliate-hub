import { prisma, ContentType, Destino, Plataforma, Rede, StatusPost, TipoPost, type Canal, type Produto, type Post, type ListaOferta } from "@/lib/database";
import { produtoVisivelNoSite, LABEL_CATEGORIA, LABEL_PLATAFORMA } from "@/lib/produtos";
import { ehCanalDeGrupo } from "./janela";
import { produtoEmCooldown, proximoHorarioLivre } from "./proximo-horario";
import { proximoMeioDiaLivre } from "./meio-dia";
import { contentTypeDoProduto, contentTypeDaLista, contentTypeDaJornada } from "./content-type";
import { LIMIAR_SIMILARIDADE_PRODUTO, similaridadeJaccard, tokenizarTitulo } from "./similaridade";
import { alertarMixSemanalSeNecessario } from "./mix-semanal";
import { gerarLegendaDaLista, gerarLegendaDoProduto, gerarLegendaDaJornada, gerarLegendaDaListaOferta } from "@/lib/conteudo/gerar-legenda";
import { montarTextoDaJornada } from "@/lib/conteudo/texto-do-post";
import { executarPublicacao } from "@/lib/publicacao/executar";
import { registrar } from "@/lib/log";
import { getSiteUrl, urlPublica } from "@/lib/site-url";
import { CAPA_EDITORIAL } from "@/lib/conteudo/capa";
import { gerarImagemDePublicacao, type EntradaArte } from "@/lib/artes";
import { comEtiquetaCanal, origemDoGo, subIdsDe } from "@/lib/shopee/etiquetas";
import { resolverLinkAfiliadoEtiquetado } from "@/lib/shopee/link-etiquetado";
import { chaveDoDia, intervaloDoDia } from "./fuso";
import { incluiPinterest, parseRedesListaOferta, redesPublicaveis } from "@/lib/listas-oferta/destinos";

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
  [Destino.MAGO_MEIA_NOITE]: "O Mago da Meia Noite",
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
async function linkAfiliadoDoProduto(produto: Produto, canal: Canal): Promise<string> {
  const link = produto.linkAfiliado.trim();
  if (!link) {
    throw new Error(
      `Produto "${produto.slug}" não tem link de afiliado — não publica sem comissão.`,
    );
  }
  return resolverLinkAfiliadoEtiquetado(produto, subIdsDe({ tipo: "produto", canal, produtoId: produto.id }));
}

/** Primeira imagem do produto, ou undefined se a API não trouxe nenhuma. */
function primeiraImagem(produto: Produto): string | undefined {
  const imagens = (produto.imagens as unknown as string[]) ?? [];
  return imagens[0];
}

interface ImagensPorFormato {
  quadrada?: string;
  retangular?: string;
}

/**
 * Compõe a arte nos dois formatos (quadrada e retangular) em paralelo. Cai
 * de volta para `fallback` (foto/capa crua) em cada formato individualmente
 * se o fundo daquele tipo/formato ainda não existir ou se a composição
 * falhar — nunca trava o agendamento por causa da arte.
 */
async function comporImagensPorFormato(
  base: Omit<EntradaArte, "formato">,
  fallback: string | undefined,
  contexto: Record<string, unknown>,
): Promise<ImagensPorFormato> {
  async function tentar(formato: "quadrada" | "retangular"): Promise<string | undefined> {
    try {
      const url = await gerarImagemDePublicacao({ ...base, formato });
      if (url) return urlPublica(url);
    } catch (erro) {
      await registrar("ERRO", "ARTES", `Falha ao compor arte ${formato} — publicando com a imagem crua.`, {
        ...contexto,
        erro: mensagemErro(erro),
      });
    }
    return fallback;
  }

  const [quadrada, retangular] = await Promise.all([tentar("quadrada"), tentar("retangular")]);
  return { quadrada, retangular };
}

/** Facebook (página/grupo) usa o formato retangular (1200×630, /photos); as demais redes usam o quadrado. */
function imagemParaRede(rede: Rede, imagens: ImagensPorFormato): string | undefined {
  if (rede === Rede.FACEBOOK_PAGE || rede === Rede.FACEBOOK_GROUP) {
    return imagens.retangular ?? imagens.quadrada;
  }
  return imagens.quadrada ?? imagens.retangular;
}

/**
 * Foto crua do produto (marketplace), sem compor com o fundo do site — os
 * posts de produto usam a imagem original em ambos os formatos.
 */
function imagensDoProduto(produto: Produto): ImagensPorFormato {
  const fotoCrua = primeiraImagem(produto);
  return { quadrada: fotoCrua, retangular: fotoCrua };
}

function pulado(canalId: string, canal: string, motivoPulado: string): ResultadoEnfileiramento {
  return { canalId, canal, motivoPulado };
}

const DIAS_JANELA_DEDUP = 7;
const MS_POR_DIA_DEDUP = 24 * 60 * 60 * 1000;

/**
 * Regra 2 de docs/hub/regras-postagem-facebook.md: bloqueia oferta_individual
 * cujo título é muito parecido com o de outro produto já postado (agendado ou
 * publicado) no mesmo canal nos últimos 7 dias. Evita o padrão observado de
 * 4 variações do mesmo kit no mesmo dia. Só se aplica ao Facebook Page.
 */
async function produtoMuitoSimilarNoCanal(
  canal: Canal,
  produto: Produto,
): Promise<{ similar: boolean; tituloMaisParecido?: string; similaridade?: number }> {
  if (canal.rede !== Rede.FACEBOOK_PAGE) return { similar: false };

  const desde = new Date(Date.now() - DIAS_JANELA_DEDUP * MS_POR_DIA_DEDUP);

  const recentes = await prisma.publicacao.findMany({
    where: {
      canalId: canal.id,
      contentType: ContentType.OFERTA_INDIVIDUAL,
      produtoId: { not: produto.id },
      OR: [
        { status: "PUBLICADA", publicadaEm: { gte: desde } },
        { status: { in: ["PENDENTE", "PUBLICANDO"] } },
      ],
    },
    select: { produto: { select: { nome: true } } },
  });

  const titulos = recentes.map((r) => r.produto?.nome).filter((nome): nome is string => Boolean(nome));
  if (titulos.length === 0) return { similar: false };

  const tokensDoProduto = tokenizarTitulo(produto.nome);
  let maior = 0;
  let maisParecido: string | undefined;
  for (const titulo of titulos) {
    const similaridade = similaridadeJaccard(tokensDoProduto, tokenizarTitulo(titulo));
    if (similaridade > maior) {
      maior = similaridade;
      maisParecido = titulo;
    }
  }

  return { similar: maior >= LIMIAR_SIMILARIDADE_PRODUTO, tituloMaisParecido: maisParecido, similaridade: maior };
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

  // Produto fora do nicho casa (destino Meu Novo Lar) pode ser divulgado, mas
  // só em grupo/mensageria — nunca em página pública (FACEBOOK_PAGE/INSTAGRAM),
  // pra preservar a regra de ouro do AdSense (ver CLAUDE.md).
  const foraDoNicho = produto.destino === Destino.MEU_NOVO_LAR && !produtoVisivelNoSite(produto);

  const canais = await prisma.canal.findMany({
    where: {
      ativo: true,
      destino: produto.destino,
      ...(foraDoNicho ? { rede: { in: [Rede.WHATSAPP, Rede.TELEGRAM, Rede.FACEBOOK_GROUP] } } : {}),
      ...(canalIds?.length ? { id: { in: canalIds } } : {}),
    },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[produto.destino] ?? produto.destino;
    const motivo = foraDoNicho
      ? `Nenhum canal de grupo (WhatsApp/Telegram/Facebook Grupo) ativo para o destino ${destino} — produto fora do nicho casa não vai para páginas públicas.`
      : `Nenhum canal ativo para o destino ${destino}. Cadastre ou ative um canal com o mesmo destino.`;
    return [pulado(produto.destino, "Nenhum canal", motivo)];
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

  let agendadoTikTokEmMidia: string | null = null;

  if (ehProdutoTikTok(produto)) {
    const jaPostouNaMidia = await prisma.publicacao.findFirst({
      where: {
        produtoId: produto.id,
        status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
        canal: { rede: { notIn: [Rede.TELEGRAM, Rede.WHATSAPP] } },
      },
      include: { canal: { select: { nome: true } } },
      orderBy: { agendadaPara: "asc" },
    });

    if (jaPostouNaMidia) {
      agendadoTikTokEmMidia = jaPostouNaMidia.canal.nome;
    }
  }

  const imagens = await imagensDoProduto(produto);

  const resultados: ResultadoEnfileiramento[] = [];

  for (const canal of canais) {
    if (agendadoTikTokEmMidia && !ehCanalDeGrupo(canal.rede)) {
      resultados.push(
        pulado(
          canal.id,
          canal.nome,
          `Produto TikTok Shop publica só uma vez nas páginas — já agendado em ${agendadoTikTokEmMidia}.`,
        ),
      );
      continue;
    }

    try {
      const resultado = await enfileirarNoCanal(canal, produto, imagemParaRede(canal.rede, imagens));
      resultados.push(resultado);
      if (ehProdutoTikTok(produto) && resultado.agendadaPara && !ehCanalDeGrupo(canal.rede)) {
        agendadoTikTokEmMidia = canal.nome;
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
  const contentType = contentTypeDoProduto();

  if (await produtoEmCooldown(canal, produto.id)) {
    return { ...base, motivoPulado: `Já publicado neste canal nos últimos ${canal.cooldownDias} dias` };
  }

  const dedup = await produtoMuitoSimilarNoCanal(canal, produto);
  if (dedup.similar) {
    const motivoPulado = `Título muito parecido (${Math.round((dedup.similaridade ?? 0) * 100)}%) com "${dedup.tituloMaisParecido}", postado nos últimos ${DIAS_JANELA_DEDUP} dias neste canal.`;
    await registrar("ALERTA", "AGENDA", `Oferta individual bloqueada por similaridade em ${canal.nome}`, {
      produto: produto.slug,
      tituloMaisParecido: dedup.tituloMaisParecido,
      similaridade: dedup.similaridade,
    });
    return { ...base, motivoPulado };
  }

  let link: string;
  try {
    link = await linkAfiliadoDoProduto(produto, canal);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  let vaga;
  try {
    vaga = await proximoHorarioLivre(canal, new Date(), undefined, contentType);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  if (!vaga) {
    const pendentes = await prisma.publicacao.count({
      where: { canalId: canal.id, status: { in: ["PENDENTE", "PUBLICANDO"] } },
    });
    const limiteOferta =
      canal.rede === Rede.FACEBOOK_PAGE ? `, teto de oferta_individual ${canal.tetoOfertaIndividualDiario}/dia` : "";
    return {
      ...base,
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min${limiteOferta}, ${pendentes} na fila). Aumente o teto do canal.`,
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
        contentType,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Publicação agendada em ${canal.nome}`, {
      produto: produto.slug,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    if (canal.rede === Rede.FACEBOOK_PAGE) {
      await alertarMixSemanalSeNecessario(canal);
    }

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

  const imagens = await imagensDaLista(post);

  const resultados: ResultadoEnfileiramento[] = [];
  for (const canal of canais) {
    try {
      resultados.push(await enfileirarPostNoCanal(canal, post, imagemParaRede(canal.rede, imagens)));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

/**
 * Compõe as artes da lista (fundo + capa + título do roundup) nos dois
 * formatos. Cai de volta para a capa manual crua se o fundo do tipo "lista"
 * ainda não existir.
 */
async function imagensDaLista(post: Post & { capa: { url: string } | null }): Promise<ImagensPorFormato> {
  const capaCrua = urlPublica(post.capa?.url);
  return comporImagensPorFormato(
    { tipo: "lista", semente: post.id, titulo: post.titulo, fotoUrl: post.capa?.url ?? null },
    capaCrua,
    { post: post.slug },
  );
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
  const link = comEtiquetaCanal(
    `${siteUrl}/blog/${post.slug}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`,
    canal,
  );

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
        contentType: contentTypeDaLista(),
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
  const link = comEtiquetaCanal(
    `${siteUrl}/blog/${post.slug}?utm_source=${ORIGEM_POR_REDE[canal.rede]}&utm_medium=social`,
    canal,
  );

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
        contentType: contentTypeDaJornada(post),
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
    link = await linkAfiliadoDoProduto(produto, canal);
  } catch (erro) {
    return pulado(canal.id, canal.nome, mensagemErro(erro));
  }

  const texto = await gerarLegendaDoProduto({ produto, rede: canal.rede, link });
  const imagemUrl = imagemParaRede(canal.rede, await imagensDoProduto(produto));
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
        contentType: contentTypeDoProduto(),
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

const LOTE_GRUPOS_POR_TICK = 20;
const HORIZONTE_COBERTURA_GRUPOS_MS = 36 * 60 * 60 * 1000;
const MS_POR_DIA_COOLDOWN = 24 * 60 * 60 * 1000;

/**
 * Mantém a fila de WhatsApp e Telegram coberta na janela 09:00–21:00
 * (intervalo 10–20 min). Cada grupo é preenchido sozinho: pendência ou
 * cooldown em outro canal não impede este.
 */
export async function enfileirarHorariosVaziosGrupos(): Promise<number> {
  const canais = await prisma.canal.findMany({
    where: { ativo: true, rede: { in: [Rede.TELEGRAM, Rede.WHATSAPP] } },
  });
  if (canais.length === 0) return 0;

  let agendados = 0;
  for (const canal of canais) {
    agendados += await preencherHorariosVaziosDoCanalGrupo(canal);
  }
  return agendados;
}

async function preencherHorariosVaziosDoCanalGrupo(canal: Canal): Promise<number> {
  const vaga = await proximoHorarioLivre(canal);
  if (!vaga) return 0;
  if (vaga.agendadaPara.getTime() > Date.now() + HORIZONTE_COBERTURA_GRUPOS_MS) return 0;

  const desdeCooldown =
    canal.cooldownDias > 0
      ? new Date(Date.now() - canal.cooldownDias * MS_POR_DIA_COOLDOWN)
      : null;

  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      destino: canal.destino,
      publicacoes: {
        none: {
          canalId: canal.id,
          OR: [
            { status: { in: ["PENDENTE", "PUBLICANDO"] } },
            ...(desdeCooldown
              ? [{ status: "PUBLICADA" as const, publicadaEm: { gte: desdeCooldown } }]
              : []),
          ],
        },
      },
    },
    select: { id: true, nome: true, destino: true, categoria: true, ativo: true },
    // Mais vendas primeiro (Shopee); sem vendas conhecidas cai no critério antigo.
    orderBy: [
      { vendas: { sort: "desc", nulls: "last" } },
      { publicacoes: { _count: "asc" } },
      { criadoEm: "asc" },
    ],
    take: LOTE_GRUPOS_POR_TICK * 4,
  });

  // Produto fora do nicho casa PODE cair aqui — grupo (WhatsApp/Telegram) é
  // justamente o canal certo pra ele (ver foraDoNicho em enfileirarProduto).
  // Só a página pública (FACEBOOK_PAGE/INSTAGRAM) continua vedada.
  let agendados = 0;
  for (const produto of produtos) {
    if (agendados >= LOTE_GRUPOS_POR_TICK) break;

    const resultados = await enfileirarProduto(produto.id, [canal.id]);
    if (resultados.some((resultado) => resultado.agendadaPara)) agendados++;
  }

  return agendados;
}

function linkGoDaLista(
  lista: Pick<ListaOferta, "codigoCurto">,
  canal?: { rede: Rede; nome: string },
  canalEtiqueta?: string,
): string {
  const o = origemDoGo({ tipo: "lista", canal, canalEtiqueta });
  return `${getSiteUrl()}/go/${lista.codigoCurto}?o=${encodeURIComponent(o)}`;
}

async function imagensDaListaOferta(lista: Pick<ListaOferta, "id" | "titulo">): Promise<ImagensPorFormato> {
  return comporImagensPorFormato(
    { tipo: "lista", semente: lista.id, titulo: lista.titulo, fotoUrl: null },
    undefined,
    { listaOferta: lista.id },
  );
}

async function jaAgendadaHoje(listaId: string, canalId: string): Promise<boolean> {
  const faixa = intervaloDoDia(chaveDoDia(new Date()));
  if (!faixa) return false;
  const existente = await prisma.publicacao.findFirst({
    where: {
      listaOfertaId: listaId,
      canalId,
      status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] },
      agendadaPara: { gte: faixa.gte, lt: faixa.lt },
    },
    select: { id: true },
  });
  return Boolean(existente);
}

/**
 * Agenda a lista pré-feita da loja nos destinos escolhidos (WhatsApp,
 * Telegram, página do Facebook). Pinterest só atualiza a legenda para copiar.
 * Sem cooldown de 30 dias: o preço da lista é fixo, então pode sair todo dia.
 */
export async function enfileirarListaOferta(
  listaId: string,
  canalIds?: string[],
): Promise<ResultadoEnfileiramento[]> {
  const lista = await prisma.listaOferta.findUnique({ where: { id: listaId } });
  if (!lista) {
    return [pulado(listaId, "Lista", "Lista não encontrada.")];
  }
  if (!lista.ativo) {
    return [pulado(lista.id, lista.titulo, "Lista está inativa.")];
  }
  if (!lista.linkAfiliado.trim()) {
    return [pulado(lista.id, lista.titulo, "Lista sem link de afiliado — não divulga sem comissão.")];
  }

  const redes = parseRedesListaOferta(lista.redes);
  if (redes.length === 0) {
    return [pulado(lista.id, lista.titulo, "Escolha pelo menos um destino (WhatsApp, Telegram, Pinterest ou página do Facebook).")];
  }

  const resultados: ResultadoEnfileiramento[] = [];

  if (incluiPinterest(redes)) {
    const link = linkGoDaLista(lista, undefined, "pinterest");
    const texto = await gerarLegendaDaListaOferta({
      titulo: lista.titulo,
      categoria: LABEL_CATEGORIA[lista.categoria],
      loja: LABEL_PLATAFORMA[lista.plataforma],
      rede: "PINTEREST",
      link,
    });
    await prisma.listaOferta.update({ where: { id: lista.id }, data: { textoPinterest: texto } });
    resultados.push({
      canalId: "pinterest",
      canal: "Pinterest",
      motivoPulado: "Legenda atualizada para copiar — Pinterest não publica sozinho.",
    });
  }

  const redesCanal = redesPublicaveis(redes);
  if (redesCanal.length === 0) return resultados;

  const canais = await prisma.canal.findMany({
    where: {
      ativo: true,
      destino: lista.destino,
      rede: { in: redesCanal },
      ...(canalIds?.length ? { id: { in: canalIds } } : {}),
    },
  });

  if (canais.length === 0) {
    const destino = LABEL_DESTINO[lista.destino] ?? lista.destino;
    resultados.push(
      pulado(
        lista.destino,
        "Nenhum canal",
        `Nenhum canal ativo de WhatsApp, Telegram ou página do Facebook para ${destino}.`,
      ),
    );
    return resultados;
  }

  const imagens = await imagensDaListaOferta(lista);

  for (const canal of canais) {
    try {
      resultados.push(await enfileirarListaOfertaNoCanal(canal, lista, imagemParaRede(canal.rede, imagens)));
    } catch (erro) {
      resultados.push(pulado(canal.id, canal.nome, mensagemErro(erro)));
    }
  }

  return resultados;
}

async function enfileirarListaOfertaNoCanal(
  canal: Canal,
  lista: ListaOferta,
  imagemUrl: string | undefined,
): Promise<ResultadoEnfileiramento> {
  const base: ResultadoEnfileiramento = { canalId: canal.id, canal: canal.nome };
  const contentType = contentTypeDaLista();

  if (await jaAgendadaHoje(lista.id, canal.id)) {
    return { ...base, motivoPulado: "Essa lista já entra na fila deste canal hoje." };
  }

  const link = linkGoDaLista(lista, canal);

  let vaga;
  try {
    vaga = await proximoHorarioLivre(canal, new Date(), undefined, contentType);
  } catch (erro) {
    return { ...base, motivoPulado: mensagemErro(erro) };
  }

  if (!vaga) {
    const pendentes = await prisma.publicacao.count({
      where: { canalId: canal.id, status: { in: ["PENDENTE", "PUBLICANDO"] } },
    });
    return {
      ...base,
      motivoPulado: `Sem horário livre (teto ${canal.tetoDiario}/dia, intervalo ${canal.intervaloMinimoMin} min, ${pendentes} na fila).`,
    };
  }

  const texto = await gerarLegendaDaListaOferta({
    titulo: lista.titulo,
    categoria: LABEL_CATEGORIA[lista.categoria],
    loja: LABEL_PLATAFORMA[lista.plataforma],
    rede: canal.rede,
    link,
  });

  const chaveIdempotencia = `${lista.id}:${canal.id}:${vaga.agendadaPara.toISOString()}`;

  try {
    const publicacao = await prisma.publicacao.create({
      data: {
        listaOfertaId: lista.id,
        canalId: canal.id,
        agendadaPara: vaga.agendadaPara,
        texto,
        imagemUrl,
        linkDestino: link,
        contentType,
        chaveIdempotencia,
      },
    });

    await registrar("INFO", "AGENDA", `Lista da loja agendada em ${canal.nome}`, {
      lista: lista.titulo,
      agendadaPara: vaga.agendadaPara.toISOString(),
    });

    if (canal.rede === Rede.FACEBOOK_PAGE) {
      await alertarMixSemanalSeNecessario(canal);
    }

    return { ...base, agendadaPara: vaga.agendadaPara.toISOString(), publicacaoId: publicacao.id };
  } catch (erro) {
    if (isViolacaoIdempotencia(erro)) {
      return { ...base, motivoPulado: "Slot já reservado por outro agendamento" };
    }
    throw erro;
  }
}

/** Worker: uma publicação por lista ativa/dia, nos destinos marcados. */
export async function enfileirarListasOfertaDoDia(): Promise<number> {
  const listas = await prisma.listaOferta.findMany({
    where: { ativo: true, divulgarDiario: true },
    select: { id: true },
  });

  let agendados = 0;
  for (const lista of listas) {
    const resultados = await enfileirarListaOferta(lista.id);
    if (resultados.some((r) => r.agendadaPara)) agendados++;
  }
  return agendados;
}
