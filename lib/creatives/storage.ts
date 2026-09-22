import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Arquivos dos criativos ficam em disco, fora do banco e fora de `public/`: só saem pelo admin.
 * Em produção, aponte CREATIVES_DIR para um volume persistente.
 */
const root = () => path.resolve(process.env.CREATIVES_DIR || path.join(process.cwd(), "storage", "creatives"));

/** O nome vem sempre de um id do banco; recusa qualquer coisa que pudesse sair da pasta. */
function safeName(file: string): string {
  if (!/^[a-z0-9]+\.jpg$/i.test(file)) throw new Error("Nome de arquivo inválido.");
  return file;
}

export async function saveCreativeFile(file: string, data: Buffer): Promise<void> {
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), safeName(file)), data);
}

export async function readCreativeFile(file: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(root(), safeName(file)));
  } catch {
    return null;
  }
}

export async function deleteCreativeFile(file: string): Promise<void> {
  await rm(path.join(root(), safeName(file)), { force: true });
}
