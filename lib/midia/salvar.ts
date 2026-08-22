import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { prisma } from "@/lib/database";
import { slugify } from "@/lib/produtos";

/**
 * Upload de imagem do CMS. Fica FORA de public/ (MEDIA_ROOT) e é servido por
 * /midia/[...caminho], para o Next não precisar de rebuild a cada arquivo novo.
 */
export const RAIZ_MIDIA = process.env.MEDIA_ROOT ?? path.join(process.cwd(), ".midia");
export const TAMANHO_MAXIMO_MIDIA = 8 * 1024 * 1024; // 8 MB
export const LARGURA_MAXIMA_MIDIA = 1600;
export const TIPOS_ACEITOS_MIDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function salvarArquivoDeMidia(entrada: {
  buffer: Buffer;
  nomeOriginal: string;
  alt?: string | null;
}) {
  const processada = sharp(entrada.buffer).rotate().resize({
    width: LARGURA_MAXIMA_MIDIA,
    withoutEnlargement: true,
  });
  const metadados = await processada.metadata();
  const conteudo = await processada.clone().webp({ quality: 82 }).toBuffer();

  const agora = new Date();
  const pasta = path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));
  const base = slugify(path.parse(entrada.nomeOriginal).name).slice(0, 60);
  const nomeArquivo = `${base || "imagem"}-${randomBytes(4).toString("hex")}.webp`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, conteudo);

  return prisma.midia.create({
    data: {
      url: `/midia/${caminhoRelativo.split(path.sep).join("/")}`,
      caminho: caminhoRelativo,
      nomeOriginal: entrada.nomeOriginal,
      mimeType: "image/webp",
      tamanhoBytes: conteudo.byteLength,
      largura: metadados.width ?? null,
      altura: metadados.height ?? null,
      alt: entrada.alt?.trim() || null,
    },
  });
}
