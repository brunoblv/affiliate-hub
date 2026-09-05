import { comporArte, type EntradaArte } from "./compor";
import { salvarArteDePublicacao } from "./salvar";

export type { EntradaArte, ArteComposta } from "./compor";
export type { TipoArte, Formato } from "./layouts";
export { salvarArteComoCapa } from "./salvar";
export { comporArte, comporCapaComCena } from "./compor";
export { gerarCapaComIa, gerarESalvarCapaDoPost, fotosDosProdutos } from "./gerar-capa-ia";
export type { EntradaCapaIa, MidiaCapaGerada, FotoDeProduto } from "./gerar-capa-ia";
export { gerarHeroDeProduto } from "./gerar-hero-produto";
export type { HeroDeProdutoGerado } from "./gerar-hero-produto";

/**
 * Compõe e salva a arte de uma publicação, devolvendo a URL pública
 * (relativa, `/midia/artes/...`) já pronta para publicar. `null` quando o
 * fundo daquele tipo/formato ainda não existe em public/fundos-posts/ —
 * quem chama deve cair de volta na imagem crua (foto do produto/capa
 * manual).
 */
export async function gerarImagemDePublicacao(entrada: EntradaArte): Promise<string | null> {
  const arte = await comporArte(entrada);
  if (!arte) return null;
  return salvarArteDePublicacao(arte.buffer, entrada.tipo);
}
