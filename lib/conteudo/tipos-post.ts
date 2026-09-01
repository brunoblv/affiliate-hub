import { TipoPost } from "@/lib/database/enums";

export const LABEL_TIPO_POST: Record<TipoPost, string> = {
  [TipoPost.JORNADA]: "Jornada",
  [TipoPost.PRODUTO]: "Produto",
  [TipoPost.LISTA]: "Lista",
};

export const TIPOS_POST: TipoPost[] = [TipoPost.JORNADA, TipoPost.PRODUTO, TipoPost.LISTA];

export function ehTipoPost(valor: string | undefined): valor is TipoPost {
  return valor === TipoPost.JORNADA || valor === TipoPost.PRODUTO || valor === TipoPost.LISTA;
}
