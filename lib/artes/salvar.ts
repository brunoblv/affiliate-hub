import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/database";
import { RAIZ_MIDIA } from "@/lib/midia/salvar";
import type { TipoArte } from "./layouts";

function pastaDoMes(agora = new Date()): string {
  return path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));
}

/**
 * Salva a arte gerada para uma publicação (ephemeral, sem entrada na
 * biblioteca de mídia do CMS) e devolve a URL pública servida por /midia.
 */
export async function salvarArteDePublicacao(buffer: Buffer, tipo: TipoArte): Promise<string> {
  // JPEG: a Content Publishing API do Instagram recusa WebP (erro 36001/2207005).
  // Facebook, Telegram e WhatsApp aceitam JPEG sem problema.
  const conteudo = await sharp(buffer).flatten({ background: "#ffffff" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const pasta = path.join("artes", tipo, pastaDoMes());
  const nomeArquivo = `${randomBytes(6).toString("hex")}.jpg`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, conteudo);

  return `/midia/${caminhoRelativo.split(path.sep).join("/")}`;
}

/**
 * Salva a arte gerada como capa de post — vira uma Midia normal (aparece na
 * biblioteca do CMS, pode ser trocada/reusada como qualquer capa enviada).
 */
export async function salvarArteComoCapa(buffer: Buffer, opcoes: { nomeBase: string; alt: string }) {
  const conteudo = await sharp(buffer).webp({ quality: 88 }).toBuffer();
  const metadados = await sharp(conteudo).metadata();
  const pasta = pastaDoMes();
  const nomeArquivo = `${opcoes.nomeBase}-${randomBytes(4).toString("hex")}.webp`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, conteudo);

  return prisma.midia.create({
    data: {
      url: `/midia/${caminhoRelativo.split(path.sep).join("/")}`,
      caminho: caminhoRelativo,
      nomeOriginal: nomeArquivo,
      mimeType: "image/webp",
      tamanhoBytes: conteudo.byteLength,
      largura: metadados.width ?? null,
      altura: metadados.height ?? null,
      alt: opcoes.alt,
    },
  });
}
