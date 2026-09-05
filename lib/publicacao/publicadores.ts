import { Rede, type Canal } from "@/lib/database";
import {
  obterTokenDePagina,
  obterTokenDeUsuario,
  obterTokenPorContaInstagram,
  mensagemErroMeta,
  type ErroGraphMeta,
} from "@/lib/meta/credentials";
import { getWhatsAppSocket } from "@/lib/whatsapp/session";
import { legendaInstagram, urlJpegPublicaParaInstagram } from "./instagram-imagem";

const VERSAO_GRAPH = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSAO_GRAPH}`;
const TELEGRAM = "https://api.telegram.org";

export interface ConteudoParaPublicar {
  /** Legenda completa (gancho, preço, CTA, link ou "link na bio", disclosure). */
  texto: string;
  imagemUrl?: string;
  /** Destino do post — afiliado da loja (produto) ou URL do site (lista/vitrine/jornada). Preview no feed da Página. */
  link: string;
  /** Facebook: publicar no /feed com preview do artigo, mesmo se houver imagem. */
  previewDeLink?: boolean;
}

export interface ResultadoPublicacao {
  idExterno: string;
}

export interface Publicador {
  publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao>;
}

export function obterPublicador(canal: Canal): Publicador {
  switch (canal.rede) {
    case Rede.FACEBOOK_PAGE:
      return new PublicadorFacebook(canal.idExterno);
    case Rede.FACEBOOK_GROUP:
      return new PublicadorFacebookGrupo(canal.idExterno);
    case Rede.INSTAGRAM:
      return new PublicadorInstagram(canal.idExterno);
    case Rede.TELEGRAM:
      return new PublicadorTelegram(canal.idExterno);
    case Rede.WHATSAPP:
      return new PublicadorWhatsApp(canal.idExterno);
    default:
      throw new Error(`Rede sem publicador: ${canal.rede}`);
  }
}

async function chamarGraph<T>(caminho: string, corpo: Record<string, string>): Promise<T> {
  const resposta = await fetch(`${GRAPH}/${caminho}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(corpo),
  });

  const json = await resposta.json();

  if (!resposta.ok) {
    const detalhe = mensagemErroMeta(json?.error as ErroGraphMeta | undefined, resposta.statusText);
    throw new Error(`Meta Graph ${caminho}: ${detalhe}`);
  }

  return json as T;
}

async function consultarGraph<T>(caminho: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}/${caminho}`);
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor);

  const resposta = await fetch(url);
  const json = await resposta.json();

  if (!resposta.ok || json.error) {
    const detalhe = mensagemErroMeta(json?.error as ErroGraphMeta | undefined, resposta.statusText);
    throw new Error(`Meta Graph ${caminho}: ${detalhe}`);
  }

  return json as T;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const POLL_CONTAINER_MS = 2_000;
const POLL_CONTAINER_MAX = 15;

/**
 * A Meta processa o JPEG depois de criar o container. Publicar antes de
 * FINISHED devolve 9007/2207027 ("media is not ready").
 */
async function esperarContainerPronto(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < POLL_CONTAINER_MAX; i++) {
    const json = await consultarGraph<{ status_code?: string }>(containerId, {
      fields: "status_code",
      access_token: token,
    });
    const status = json.status_code;
    if (status === "FINISHED" || status === "PUBLISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`Instagram: container ${status === "EXPIRED" ? "expirou" : "falhou no processamento"}.`);
    }
    await esperar(POLL_CONTAINER_MS);
  }
  throw new Error("Instagram: a imagem ainda não ficou pronta para publicar.");
}

/**
 * Página do Facebook. Publica foto com a legenda já montada quando há imagem;
 * senão, post de link (preview via `link`). Token da Página, nunca do usuário.
 */
class PublicadorFacebook implements Publicador {
  constructor(private readonly pageId: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    const token = await obterTokenDePagina(this.pageId);

    if (conteudo.previewDeLink || !conteudo.imagemUrl) {
      const resposta = await chamarGraph<{ id: string }>(`${this.pageId}/feed`, {
        message: conteudo.texto,
        link: conteudo.link,
        access_token: token,
      });

      return { idExterno: resposta.id };
    }

    const resposta = await chamarGraph<{ id?: string; post_id?: string }>(`${this.pageId}/photos`, {
      url: conteudo.imagemUrl,
      caption: conteudo.texto,
      access_token: token,
    });

    return { idExterno: resposta.post_id ?? resposta.id ?? "" };
  }
}

/**
 * Grupo do Facebook. Diferente da Página, a API de grupos exige o token de
 * usuário (nunca token de Página) com a permissão `publish_to_groups`, e o
 * app precisa estar instalado no grupo — configuração feita uma vez direto
 * no Facebook, fora do alcance deste código.
 */
class PublicadorFacebookGrupo implements Publicador {
  constructor(private readonly groupId: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    const token = await obterTokenDeUsuario();

    const resposta = await chamarGraph<{ id: string }>(`${this.groupId}/feed`, {
      message: conteudo.texto,
      ...(conteudo.previewDeLink ? { link: conteudo.link } : {}),
      access_token: token,
    });

    return { idExterno: resposta.id };
  }
}

/**
 * Instagram Business. Fluxo de dois passos da API: cria o container, depois
 * publica. Imagem é obrigatória — sem foto, o Instagram recusa.
 */
class PublicadorInstagram implements Publicador {
  constructor(private readonly igUserId: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    if (!conteudo.imagemUrl) {
      throw new Error("Instagram exige imagem — publicação sem foto não pode sair.");
    }

    const token = await obterTokenPorContaInstagram(this.igUserId);
    const imageUrl = await urlJpegPublicaParaInstagram(conteudo.imagemUrl);

    // O link não é clicável na legenda do Instagram; o texto já traz "link na bio".
    const container = await chamarGraph<{ id: string }>(`${this.igUserId}/media`, {
      image_url: imageUrl,
      caption: legendaInstagram(conteudo.texto),
      access_token: token,
    });

    await esperarContainerPronto(container.id, token);

    const publicado = await chamarGraph<{ id: string }>(`${this.igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });

    return { idExterno: publicado.id };
  }
}

/**
 * Canal ou grupo do Telegram via Bot API. O bot precisa já ter sido adicionado
 * como admin do chat — passo manual, feito uma vez.
 */
class PublicadorTelegram implements Publicador {
  constructor(private readonly chatId: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");

    const legenda = conteudo.texto;

    // Legenda de foto no Telegram tem limite de 1024 caracteres.
    const usarFoto = Boolean(conteudo.imagemUrl) && legenda.length <= 1024;

    const metodo = usarFoto ? "sendPhoto" : "sendMessage";
    const corpo = usarFoto
      ? { chat_id: this.chatId, photo: conteudo.imagemUrl!, caption: legenda, parse_mode: "HTML" }
      : { chat_id: this.chatId, text: legenda, parse_mode: "HTML", disable_web_page_preview: "false" };

    const resposta = await fetch(`${TELEGRAM}/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });

    const json = await resposta.json();

    if (!resposta.ok || !json.ok) {
      throw new Error(`Telegram ${metodo}: ${json.description ?? resposta.statusText}`);
    }

    return { idExterno: String(json.result.message_id) };
  }
}

/**
 * Grupo do WhatsApp via Baileys — ver aviso sobre biblioteca não-oficial em
 * lib/whatsapp/session.ts. O JID do grupo (identificador externo do canal) é
 * obtido rodando `npm run whatsapp:login`.
 */
class PublicadorWhatsApp implements Publicador {
  constructor(private readonly groupJid: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    if (!this.groupJid) throw new Error("Canal do WhatsApp sem JID de grupo configurado (identificador externo).");

    const legenda = conteudo.texto;
    const sock = await getWhatsAppSocket();

    const resultado = conteudo.imagemUrl
      ? await sock.sendMessage(this.groupJid, { image: { url: conteudo.imagemUrl }, caption: legenda })
      : await sock.sendMessage(this.groupJid, { text: legenda });

    const idExterno = resultado?.key?.id;
    if (!idExterno) throw new Error("WhatsApp: envio não retornou message id.");

    return { idExterno };
  }
}
