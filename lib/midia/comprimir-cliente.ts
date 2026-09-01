import { LARGURA_MAXIMA_MIDIA, tipoDeImagem } from "@/lib/midia/constantes";

/**
 * Teto abaixo do `client_max_body_size` padrão do Nginx (1 MB). O multipart
 * soma um pouco de overhead, então o arquivo em si precisa ficar menor.
 */
const TETO_PROXY_BYTES = 800 * 1024;

function blobParaArquivo(blob: Blob, nomeOriginal: string, mime: string): File {
  const base = nomeOriginal.replace(/\.[^.]+$/, "") || "imagem";
  const ext = mime === "image/jpeg" ? "jpg" : "webp";
  return new File([blob], `${base}.${ext}`, { type: mime });
}

function desenhar(bitmap: ImageBitmap, largura: number, altura: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível compactar a imagem neste navegador.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  return canvas;
}

function canvasParaBlob(canvas: HTMLCanvasElement, mime: string, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao compactar a imagem."));
      },
      mime,
      qualidade,
    );
  });
}

async function compactarCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const formatos: Array<{ mime: string; qualidade: number }> = [
    { mime: "image/webp", qualidade: 0.82 },
    { mime: "image/jpeg", qualidade: 0.82 },
  ];

  let ultimoErro: unknown;
  for (const { mime, qualidade } of formatos) {
    try {
      let atual = qualidade;
      let blob = await canvasParaBlob(canvas, mime, atual);
      while (blob.size > TETO_PROXY_BYTES && atual > 0.45) {
        atual = Math.round((atual - 0.12) * 100) / 100;
        blob = await canvasParaBlob(canvas, mime, atual);
      }
      if (blob.size <= TETO_PROXY_BYTES) return blob;
      ultimoErro = blob;
    } catch (erro) {
      ultimoErro = erro;
    }
  }

  if (ultimoErro instanceof Blob) return ultimoErro;
  throw ultimoErro instanceof Error ? ultimoErro : new Error("Falha ao compactar a imagem.");
}

/**
 * Reduz JPEG/PNG de celular (~2 MB) para caber no proxy (Nginx 1 MB).
 * Se já estiver pequeno, devolve o original.
 */
export async function comprimirImagemParaUpload(arquivo: File): Promise<File> {
  if (!tipoDeImagem(arquivo)) {
    throw new Error(`Tipo não aceito: ${arquivo.type || arquivo.name}. Use JPEG, PNG, WebP ou AVIF.`);
  }
  if (arquivo.size <= TETO_PROXY_BYTES) return arquivo;
  if (typeof createImageBitmap !== "function") return arquivo;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não foi possível ler a imagem. Converta para JPEG ou PNG e tente de novo.");
  }

  try {
    const escala = Math.min(1, LARGURA_MAXIMA_MIDIA / Math.max(bitmap.width, 1));
    let largura = Math.max(1, Math.round(bitmap.width * escala));
    let altura = Math.max(1, Math.round(bitmap.height * escala));
    let canvas = desenhar(bitmap, largura, altura);
    let blob = await compactarCanvas(canvas);

    while (blob.size > TETO_PROXY_BYTES && largura > 640) {
      largura = Math.max(640, Math.round(largura * 0.75));
      altura = Math.max(1, Math.round(altura * 0.75));
      canvas = desenhar(bitmap, largura, altura);
      blob = await compactarCanvas(canvas);
    }

    return blobParaArquivo(blob, arquivo.name, blob.type || "image/jpeg");
  } finally {
    bitmap.close();
  }
}
