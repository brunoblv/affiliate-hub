import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import https from "node:https";
import sharp from "sharp";
import type { WAMediaUploadFunction, WASocket } from "@whiskeysockets/baileys";
import { resolverBufferDeImagem } from "@/lib/artes/foto";

/**
 * Baileys 7.0.0-rc14 sobe mídia de canal em `/mms/*` e o WhatsApp devolve
 * `directPath` `/o1/` — a foto não aparece (ACK 479). O cliente oficial usa
 * `/newsletter/newsletter-*` e recebe `/m1/`.
 */
const CAMINHO_MIDIA_CANAL: Record<string, string> = {
  image: "/newsletter/newsletter-image",
  video: "/newsletter/newsletter-video",
  document: "/newsletter/newsletter-document",
  audio: "/newsletter/newsletter-audio",
  sticker: "/newsletter/newsletter-image",
  "thumbnail-link": "/newsletter/newsletter-thumbnail-link",
};

type RespostaUploadCanal = {
  url?: string;
  direct_path?: string;
  thumbnail_info?: {
    thumbnail_direct_path?: string;
    thumbnail_sha256?: string;
  };
};

function tokenDeUpload(b64: string): string {
  return encodeURIComponent(b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
}

async function postarArquivo(url: string, filePath: string, timeoutMs?: number): Promise<RespostaUploadCanal | undefined> {
  const parsed = new URL(url);
  const size = (await stat(filePath)).size;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          Origin: "https://web.whatsapp.com",
          "Content-Length": size,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body) as RespostaUploadCanal);
          } catch {
            resolve(undefined);
          }
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Upload timeout"));
    });

    const stream = createReadStream(filePath);
    stream.pipe(req);
    stream.on("error", (erro) => {
      req.destroy();
      reject(erro);
    });
  });
}

type ResultadoUploadBaileys = {
  mediaUrl: string;
  directPath: string;
  thumbnailDirectPath?: string;
  thumbnailSha256?: string;
};

/** Upload no CDN de canal de transmissão — usar só quando o destino é `@newsletter`. */
export function uploadMidiaCanalWhatsApp(sock: WASocket): WAMediaUploadFunction {
  return async (filePath, { fileEncSha256B64, mediaType, timeoutMs }) => {
    const info = await sock.refreshMediaConn(false);
    const token = tokenDeUpload(fileEncSha256B64);
    const mediaPath = CAMINHO_MIDIA_CANAL[mediaType] ?? CAMINHO_MIDIA_CANAL.image;
    let ultimoErro = "sem resposta do CDN";

    for (const { hostname } of info.hosts) {
      const url = `https://${hostname}${mediaPath}/${token}?auth=${encodeURIComponent(info.auth)}&token=${token}&server_thumb_gen=1`;
      try {
        const json = await postarArquivo(url, filePath, timeoutMs);
        const directPath = json?.direct_path ?? "";
        if (json?.url || directPath) {
          if (directPath.startsWith("/o1/")) {
            ultimoErro = `CDN devolveu directPath de grupo (${directPath.slice(0, 24)}…)`;
            continue;
          }
          const resultado: ResultadoUploadBaileys = {
            mediaUrl: json?.url ?? "",
            directPath,
            thumbnailDirectPath: json?.thumbnail_info?.thumbnail_direct_path,
            thumbnailSha256: json?.thumbnail_info?.thumbnail_sha256,
          };
          return resultado as Awaited<ReturnType<WAMediaUploadFunction>>;
        }
        ultimoErro = `resposta sem url/direct_path: ${JSON.stringify(json)?.slice(0, 180)}`;
      } catch (erro) {
        ultimoErro = erro instanceof Error ? erro.message : String(erro);
      }
    }

    throw new Error(`WhatsApp Canal: falha ao subir a foto no CDN do canal (${ultimoErro}).`);
  };
}

export function directPathDeGrupo(directPath: string | null | undefined): boolean {
  return Boolean(directPath?.startsWith("/o1/"));
}

export interface ImagemWhatsApp {
  jpeg: Buffer;
  jpegThumbnail: string;
  width?: number;
  height?: number;
}

/** Baixa a foto (marketplace ou /midia) e devolve JPEG + thumb — Baileys/WhatsApp aceitam melhor que WebP. */
export async function jpegParaWhatsApp(url: string): Promise<ImagemWhatsApp> {
  const bruto = await resolverBufferDeImagem(url);
  const jpeg = await sharp(bruto).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const meta = await sharp(jpeg).metadata();
  const thumb = await sharp(jpeg).resize(64, 64, { fit: "inside" }).jpeg({ quality: 40 }).toBuffer();
  return {
    jpeg,
    jpegThumbnail: thumb.toString("base64"),
    width: meta.width,
    height: meta.height,
  };
}
