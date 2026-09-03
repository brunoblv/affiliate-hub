import { Rede, TipoPost } from "@/lib/database/enums";

/** Teto da Affiliate Open API: no máximo 5 subIds, 50 caracteres cada. */
const MAX_SUB_IDS = 5;
const MAX_CHARS = 50;

export type TipoEtiqueta = "produto" | "lista" | "jornada" | "vitrine";

const PREFIXO_REDE: Record<Rede, string> = {
  [Rede.FACEBOOK_PAGE]: "facebook",
  [Rede.FACEBOOK_GROUP]: "facebook",
  [Rede.INSTAGRAM]: "instagram",
  [Rede.TELEGRAM]: "telegram",
  [Rede.WHATSAPP]: "whatsapp",
};

const TIPO_DO_POST: Record<TipoPost, TipoEtiqueta> = {
  [TipoPost.PRODUTO]: "produto",
  [TipoPost.LISTA]: "lista",
  [TipoPost.JORNADA]: "jornada",
};

/** Slug aceito como sub_id da Shopee: minúsculas, números e hífen. */
export function slugEtiqueta(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_CHARS);
}

/**
 * Etiqueta do canal no relatório da Shopee.
 * "Meu Novo Lar" na página do Facebook → `facebook-meu-novo-lar`.
 * "Achadinhos" no grupo → `facebook-achadinhos`.
 */
export function etiquetaDoCanal(canal: { rede: Rede; nome: string }): string {
  const prefixo = PREFIXO_REDE[canal.rede];
  const nome = slugEtiqueta(canal.nome);
  if (!nome) return slugEtiqueta(prefixo);
  if (nome === prefixo || nome.startsWith(`${prefixo}-`)) return nome.slice(0, MAX_CHARS);
  return `${prefixo}-${nome}`.slice(0, MAX_CHARS);
}

export function etiquetaDoTipoPost(tipo: TipoPost): TipoEtiqueta {
  return TIPO_DO_POST[tipo];
}

/** Descarta lixo na query `?o=` — só entra slug de etiqueta. */
export function sanitizarEtiquetaCanal(valor: string | undefined | null): string | undefined {
  if (!valor) return undefined;
  const slug = slugEtiqueta(valor);
  return slug || undefined;
}

export function subIdsDe(params: {
  tipo: TipoEtiqueta;
  canal?: { rede: Rede; nome: string };
  canalEtiqueta?: string;
}): string[] {
  const subIds: string[] = [params.tipo];
  const canal = params.canalEtiqueta
    ? sanitizarEtiquetaCanal(params.canalEtiqueta)
    : params.canal
      ? etiquetaDoCanal(params.canal)
      : undefined;
  if (canal && canal !== params.tipo) subIds.push(canal);
  return subIds.slice(0, MAX_SUB_IDS);
}

/**
 * Valor de `?o=` no /go e nas URLs do blog/vitrine compartilhadas nas redes.
 * `lista` no site; `lista:facebook-achadinhos` quando o clique veio daquele grupo.
 */
export function origemDoGo(params: {
  tipo: TipoEtiqueta;
  canal?: { rede: Rede; nome: string };
  canalEtiqueta?: string;
}): string {
  return subIdsDe(params).join(":");
}

const TIPOS: ReadonlySet<string> = new Set(["produto", "lista", "jornada", "vitrine", "blog"]);

function pareceCanal(slug: string): boolean {
  return /^(facebook|instagram|telegram|whatsapp)(-|$)/.test(slug);
}

/** Interpreta o `?o=` do /go e devolve os subIds pra gerar o link da Shopee. */
export function subIdsDaOrigem(origem: string | null | undefined): string[] {
  if (!origem) return [];
  const partes = origem.split(":").map(slugEtiqueta).filter(Boolean);
  if (partes.length === 0) return [];

  const tipo = partes[0]!;
  if (tipo === "vitrine") {
    const subIds = ["vitrine"];
    const canal = partes.slice(1).find(pareceCanal);
    if (canal) subIds.push(canal);
    return subIds.slice(0, MAX_SUB_IDS);
  }

  if (tipo === "blog") return ["blog"];

  if (TIPOS.has(tipo)) {
    const subIds = [tipo];
    if (partes[1] && partes[1] !== tipo) subIds.push(partes[1]);
    return subIds.slice(0, MAX_SUB_IDS);
  }

  return partes.slice(0, MAX_SUB_IDS);
}

/** Acrescenta `?o=` com a etiqueta do canal numa URL absoluta do site. */
export function comEtiquetaCanal(urlAbsoluta: string, canal: { rede: Rede; nome: string }): string {
  const url = new URL(urlAbsoluta);
  url.searchParams.set("o", etiquetaDoCanal(canal));
  return url.toString();
}
