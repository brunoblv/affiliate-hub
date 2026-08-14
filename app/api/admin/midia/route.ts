import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * Upload de imagem do CMS. O editor chama isto ao anexar um arquivo e recebe
 * de volta a URL, que vira ![alt](url) no markdown do post.
 *
 * MEDIA_ROOT fica FORA de public/ e é servido por rota própria (ou pelo
 * Nginx), para que o Next não precise de rebuild a cada imagem nova.
 */

const RAIZ_MIDIA = process.env.MEDIA_ROOT ?? path.join(process.cwd(), ".midia");
const TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8 MB
const LARGURA_MAXIMA = 1600;

const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const formulario = await requisicao.formData();
  const arquivo = formulario.get("arquivo");
  const alt = String(formulario.get("alt") ?? "").trim();

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Envie um arquivo no campo 'arquivo'." }, { status: 400 });
  }

  if (!TIPOS_ACEITOS.has(arquivo.type)) {
    return NextResponse.json({ erro: `Tipo não aceito: ${arquivo.type}` }, { status: 415 });
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "Arquivo acima de 8 MB." }, { status: 413 });
  }

  const original = Buffer.from(await arquivo.arrayBuffer());

  // Converte tudo para webp e limita a largura: um JPEG de celular de 4 MB
  // vira ~180 KB.
  const processada = sharp(original).rotate().resize({ width: LARGURA_MAXIMA, withoutEnlargement: true });
  const metadados = await processada.metadata();
  const conteudo = await processada.webp({ quality: 82 }).toBuffer();

  const agora = new Date();
  const pasta = path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));

  const base = path
    .parse(arquivo.name)
    .name.toLowerCase()
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const nomeArquivo = `${base || "imagem"}-${randomBytes(4).toString("hex")}.webp`;
  const caminhoRelativo = path.join(pasta, nomeArquivo);
  const caminhoAbsoluto = path.join(RAIZ_MIDIA, caminhoRelativo);

  await mkdir(path.dirname(caminhoAbsoluto), { recursive: true });
  await writeFile(caminhoAbsoluto, conteudo);

  const midia = await prisma.midia.create({
    data: {
      url: `/midia/${caminhoRelativo.split(path.sep).join("/")}`,
      caminho: caminhoRelativo,
      nomeOriginal: arquivo.name,
      mimeType: "image/webp",
      tamanhoBytes: conteudo.byteLength,
      largura: metadados.width ?? null,
      altura: metadados.height ?? null,
      alt: alt || null,
    },
  });

  return NextResponse.json({
    ...midia,
    markdown: `![${midia.alt ?? ""}](${midia.url})`,
  });
}

export async function GET(requisicao: Request) {
  const sessao = await auth();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(requisicao.url);
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? 1));
  const porPagina = 40;

  const [itens, total] = await Promise.all([
    prisma.midia.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.midia.count(),
  ]);

  return NextResponse.json({ itens, total, pagina, porPagina });
}
