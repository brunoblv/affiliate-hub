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

/**
 * Slug interno (site `?o=`, chave de cache): minúsculas, números e hífen.
 * Na API da Shopee só entra alfanumérico — ver `subIdsParaApi`.
 */
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

/**
 * Últimos N caracteres do id (cuid) do produto — não os primeiros, porque um
 * cuid começa com timestamp; produtos cadastrados perto um do outro
 * colidiriam mais fácil num prefixo do que num sufixo (mistura contador +
 * parte aleatória). Usado como 4º sub-id só no relatório de CLIQUES (a
 * Shopee não devolve o produto lá, diferente do relatório de conversão, que
 * já traz itemId por venda) — ver lib/shopee/relatorio-cliques.ts.
 */
export const TAMANHO_FRAGMENTO_PRODUTO = 10;

export function fragmentoProduto(produtoId: string): string {
  return produtoId.slice(-TAMANHO_FRAGMENTO_PRODUTO);
}

/** Acrescenta o fragmento do produto a uma lista de subIds já pronta (ex. vinda de subIdsDaOrigem), respeitando o teto de 5. */
export function comFragmentoProduto(subIds: string[], produtoId: string): string[] {
  if (subIds.includes(fragmentoProduto(produtoId))) return subIds;
  return [...subIds, fragmentoProduto(produtoId)].slice(0, MAX_SUB_IDS);
}

/**
 * [tipo, rede, canal específico, produto] — até 4 dos 5 sub-ids da Shopee.
 * `canal` (objeto com rede+nome) é o caminho novo, com rede e canal em slots
 * separados — mais fácil de agregar no relatório do que a string combinada
 * de `etiquetaDoCanal`. `canalEtiqueta` (string já pronta, ex. vinda de `?o=`
 * de um link externo) continua em um slot só, porque nesse ponto já não
 * sabemos separar rede de canal. `produtoId` só é usado quando `tipo` é
 * "produto" (link de um produto só, não faz sentido pra lista/jornada/vitrine).
 */
export function subIdsDe(params: {
  tipo: TipoEtiqueta;
  canal?: { rede: Rede; nome: string };
  canalEtiqueta?: string;
  produtoId?: string;
}): string[] {
  const subIds: string[] = [params.tipo];

  if (params.canal) {
    subIds.push(PREFIXO_REDE[params.canal.rede]);
    const nomeCanal = slugEtiqueta(params.canal.nome);
    if (nomeCanal) subIds.push(nomeCanal);
  } else if (params.canalEtiqueta) {
    const etiqueta = sanitizarEtiquetaCanal(params.canalEtiqueta);
    if (etiqueta && etiqueta !== params.tipo) subIds.push(etiqueta);
  }

  if (params.tipo === "produto" && params.produtoId) {
    subIds.push(fragmentoProduto(params.produtoId));
  }

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
  return /^(facebook|instagram|telegram|whatsapp|pinterest)(-|$)/.test(slug);
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
    // partes[1] = rede, partes[2] = canal específico (ver subIdsDe) — o `o=`
    // pode ter as duas ou só a combinada antiga, então aceita qualquer uma.
    if (partes[1] && partes[1] !== tipo) subIds.push(partes[1]);
    if (partes[2] && partes[2] !== tipo && partes[2] !== partes[1]) subIds.push(partes[2]);
    return subIds.slice(0, MAX_SUB_IDS);
  }

  return partes.slice(0, MAX_SUB_IDS);
}

/**
 * Charset da Affiliate Open API no `subIds`: só a-z e 0-9 (erro 11001
 * "invalid sub id" com hífen ou underscore). Site e cache continuam com hífen.
 */
export function subIdsParaApi(subIds: string[]): string[] {
  const saida: string[] = [];
  const vistos = new Set<string>();
  for (const bruto of subIds) {
    const id = bruto.replace(/[^a-z0-9]/g, "").slice(0, MAX_CHARS);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    saida.push(id);
    if (saida.length >= MAX_SUB_IDS) break;
  }
  return saida;
}

/** Acrescenta `?o=` com a etiqueta do canal numa URL absoluta do site. */
export function comEtiquetaCanal(urlAbsoluta: string, canal: { rede: Rede; nome: string }): string {
  const url = new URL(urlAbsoluta);
  url.searchParams.set("o", etiquetaDoCanal(canal));
  return url.toString();
}
