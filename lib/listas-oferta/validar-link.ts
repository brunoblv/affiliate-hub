import { Plataforma } from "@/lib/database/enums";

const HOSPEDEIROS: Record<Plataforma, RegExp[]> = {
  [Plataforma.SHOPEE]: [/^s\.shopee\.com\.br$/i, /^shope\.ee$/i],
  [Plataforma.MERCADO_LIVRE]: [/^meli\.la$/i, /^(www\.)?mercadolivre\.com\.br$/i],
  [Plataforma.AMAZON]: [/^amzn\.to$/i, /^(www\.)?amazon\.com\.br$/i],
  [Plataforma.TIKTOK_SHOP]: [/tiktok\.com$/i, /^vt\.tiktok\.com$/i],
};

const DICA: Record<Plataforma, string> = {
  [Plataforma.SHOPEE]: "Use o link curto de afiliado (s.shopee.com.br ou shope.ee), o da Oferta Shopee no painel.",
  [Plataforma.MERCADO_LIVRE]: "Use o link de afiliado (meli.la), não a URL crua do anúncio.",
  [Plataforma.AMAZON]: "Use o link de afiliado (amzn.to ou amazon.com.br com tag).",
  [Plataforma.TIKTOK_SHOP]: "Use o link de afiliado do TikTok Shop.",
};

export function validarLinkListaOferta(raw: string, plataforma: Plataforma): { ok: true; url: string } | { ok: false; erro: string } {
  const texto = raw.trim();
  if (!texto) return { ok: false, erro: "Cole o link de afiliado da lista." };

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return { ok: false, erro: "Isso não parece uma URL. Cole o link completo, começando com https://." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, erro: "O link precisa ser http ou https." };
  }

  const host = url.hostname.replace(/^www\./i, "");
  const aceitos = HOSPEDEIROS[plataforma];
  if (!aceitos.some((regex) => regex.test(url.hostname) || regex.test(host))) {
    return { ok: false, erro: DICA[plataforma] };
  }

  if (plataforma === Plataforma.SHOPEE && /^shopee\.com\.br$/i.test(host)) {
    return { ok: false, erro: DICA[Plataforma.SHOPEE] };
  }

  return { ok: true, url: url.toString() };
}
