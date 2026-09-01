import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { prisma } from "@/lib/database";
import { LARGURA_MAXIMA_MIDIA } from "@/lib/midia/constantes";
import { slugify } from "@/lib/produtos";

export { LARGURA_MAXIMA_MIDIA, TAMANHO_MAXIMO_MIDIA, TIPOS_ACEITOS_MIDIA } from "@/lib/midia/constantes";

/**
 * Upload de mídia do CMS. Fica FORA de public/ (MEDIA_ROOT) e é servido por
 * /midia/[...caminho], para o Next não precisar de rebuild a cada arquivo novo.
 */
export const RAIZ_MIDIA = process.env.MEDIA_ROOT ?? path.join(process.cwd(), ".midia");

function mensagemErroDeImagem(erro: unknown): Error {
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  if (/unsupported image format|Input buffer/i.test(detalhe)) {
    return new Error("Não foi possível ler a imagem. Use JPEG, PNG, WebP ou AVIF.");
  }
  if (/pixel limit|too large/i.test(detalhe)) {
    return new Error("A imagem tem resolução grande demais. Reduza e tente de novo.");
  }
  return new Error("Falha ao processar a imagem.");
}

function pastaDoMes(agora = new Date()): string {
  return path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));
}

export async function salvarArquivoDeMidia(entrada: {
  buffer: Buffer;
  nomeOriginal: string;
  alt?: string | null;
}) {
  let metadados: { width?: number; height?: number };
  let conteudo: Buffer;
  try {
    const processada = sharp(entrada.buffer).rotate().resize({
      width: LARGURA_MAXIMA_MIDIA,
      withoutEnlargement: true,
    });
    metadados = await processada.metadata();
    conteudo = await processada.clone().webp({ quality: 82 }).toBuffer();
  } catch (erro) {
    throw mensagemErroDeImagem(erro);
  }

  const pasta = pastaDoMes();
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

export async function salvarArquivoDeAudio(entrada: {
  buffer: Buffer;
  nomeOriginal: string;
  alt?: string | null;
}) {
  const pasta = pastaDoMes();
  const base = slugify(path.parse(entrada.nomeOriginal).name).slice(0, 60);
  const nomeArquivo = `${base || "audio"}-${randomBytes(4).toString("hex")}.wav`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, entrada.buffer);

  return prisma.midia.create({
    data: {
      url: `/midia/${caminhoRelativo.split(path.sep).join("/")}`,
      caminho: caminhoRelativo,
      nomeOriginal: entrada.nomeOriginal,
      mimeType: "audio/wav",
      tamanhoBytes: entrada.buffer.byteLength,
      alt: entrada.alt?.trim() || null,
    },
  });
}

export async function excluirArquivoDeMidia(caminhoRelativo: string): Promise<void> {
  const absoluto = path.join(RAIZ_MIDIA, caminhoRelativo);
  await unlink(absoluto).catch(() => undefined);
}
