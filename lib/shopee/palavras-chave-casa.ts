import { Categoria } from "@/lib/database/enums";
import { COMODOS_CASA } from "./catalogo-comodos";

export { ehForaDoTemaCasa } from "@/lib/nicho";

/**
 * Um par keyword/categoria por cômodo (os dois primeiros tipos) — volume
 * parecido com a lista antiga, mas com termos concretos do catálogo.
 */
export const PALAVRAS_CHAVE_CASA: Array<{ keyword: string; categoria: Categoria }> = COMODOS_CASA.flatMap((comodo) =>
  comodo.itens.slice(0, 2).map((item) => ({ keyword: item.keyword, categoria: item.categoria })),
);
