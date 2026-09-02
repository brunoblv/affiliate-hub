import { comporArteQuadrada, type EntradaArte } from "./compor";
import { salvarArteDePublicacao } from "./salvar";

export type { EntradaArte, ArteComposta } from "./compor";
export type { TipoArte } from "./layouts";
export { salvarArteComoCapa } from "./salvar";
export { comporArteQuadrada } from "./compor";

/**
 * Compõe e salva a arte quadrada de uma publicação, devolvendo a URL pública
 * (relativa, `/midia/artes/...`) já pronta para publicar. `null` quando o
 * fundo daquele tipo ainda não existe em public/fundos-posts/ — quem chama
 * deve cair de volta na imagem crua (foto do produto/capa manual).
 */
export async function gerarImagemDePublicacao(entrada: EntradaArte): Promise<string | null> {
  const arte = await comporArteQuadrada(entrada);
  if (!arte) return null;
  return salvarArteDePublicacao(arte.buffer, entrada.tipo);
}
