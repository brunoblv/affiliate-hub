import { Rede, type Canal } from "@/lib/database";
import { obterTokenDePagina, obterTokenPorContaInstagram } from "@/lib/meta/credentials";

const VERSAO_GRAPH = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSAO_GRAPH}`;
const TELEGRAM = "https://api.telegram.org";

export interface ConteudoParaPublicar {
  texto: string;
  imagemUrl?: string;
  link: string;
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
    case Rede.INSTAGRAM:
      return new PublicadorInstagram(canal.idExterno);
    case Rede.TELEGRAM:
      return new PublicadorTelegram(canal.idExterno);
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
    const detalhe = json?.error?.message ?? resposta.statusText;
    throw new Error(`Meta Graph ${caminho}: ${detalhe}`);
  }

  return json as T;
}

/**
 * Página do Facebook. Publica foto com legenda quando há imagem; senão, post
 * de link. O token é o da Página (page access token), nunca o do usuário.
 */
class PublicadorFacebook implements Publicador {
  constructor(private readonly pageId: string) {}

  async publicar(conteudo: ConteudoParaPublicar): Promise<ResultadoPublicacao> {
    const token = await obterTokenDePagina(this.pageId);

    if (conteudo.imagemUrl) {
      const resposta = await chamarGraph<{ id?: string; post_id?: string }>(`${this.pageId}/photos`, {
        url: conteudo.imagemUrl,
        caption: `${conteudo.texto}\n\n${conteudo.link}`,
        access_token: token,
      });

      return { idExterno: resposta.post_id ?? resposta.id ?? "" };
    }

    const resposta = await chamarGraph<{ id: string }>(`${this.pageId}/feed`, {
      message: conteudo.texto,
      link: conteudo.link,
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
      throw new Error("Instagram exige imagem — produto sem foto não pode ser publicado.");
    }

    const token = await obterTokenPorContaInstagram(this.igUserId);

    // O link não é clicável na legenda do Instagram; entra como referência
    // textual e o tráfego real vem da bio.
    const container = await chamarGraph<{ id: string }>(`${this.igUserId}/media`, {
      image_url: conteudo.imagemUrl,
      caption: conteudo.texto,
      access_token: token,
    });

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

    const legenda = `${conteudo.texto}\n\n${conteudo.link}`;

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
