import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TipoArte } from "./layouts";

/**
 * Fundos ficam em public/fundos-posts/<tipo>/<variante>.png (1080×1080,
 * wordmark e decoração já embutidos — ver README na própria pasta). Servidos
 * também como estáticos pelo Next, mas aqui lemos direto do disco para
 * compor a arte no servidor.
 */
const RAIZ_FUNDOS = path.join(process.cwd(), "public", "fundos-posts");

export function caminhoDoFundo(tipo: TipoArte, arquivo: string): string {
  return path.join(RAIZ_FUNDOS, tipo, arquivo);
}

export function fundoDisponivel(tipo: TipoArte, arquivo: string): boolean {
  return existsSync(caminhoDoFundo(tipo, arquivo));
}

export async function lerFundo(tipo: TipoArte, arquivo: string): Promise<Buffer> {
  return readFile(caminhoDoFundo(tipo, arquivo));
}
