import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Formato, TipoArte } from "./layouts";

/**
 * Fundos ficam em public/fundos-posts/<quadrado|retangular>/<tipo>/<variante>.png
 * (wordmark e decoração já embutidos — ver README na própria pasta). Servidos
 * também como estáticos pelo Next, mas aqui lemos direto do disco para
 * compor a arte no servidor.
 */
const RAIZ_FUNDOS = path.join(process.cwd(), "public", "fundos-posts");

function pastaDoFormato(formato: Formato): string {
  return formato === "retangular" ? "retangular" : "quadrado";
}

export function caminhoDoFundo(tipo: TipoArte, arquivo: string, formato: Formato = "quadrada"): string {
  return path.join(RAIZ_FUNDOS, pastaDoFormato(formato), tipo, arquivo);
}

export function fundoDisponivel(tipo: TipoArte, arquivo: string, formato: Formato = "quadrada"): boolean {
  return existsSync(caminhoDoFundo(tipo, arquivo, formato));
}

export async function lerFundo(tipo: TipoArte, arquivo: string, formato: Formato = "quadrada"): Promise<Buffer> {
  return readFile(caminhoDoFundo(tipo, arquivo, formato));
}
