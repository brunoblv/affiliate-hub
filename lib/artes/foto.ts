import { readFile } from "node:fs/promises";
import path from "node:path";
import { RAIZ_MIDIA } from "@/lib/midia/salvar";

const UA_IMAGEM =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Resolve os bytes de uma foto a compor na arte — sem round-trip HTTP para
 * arquivos locais (o worker de agenda pode rodar sem o Next de pé).
 */
export async function resolverBufferDeImagem(url: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(url)) {
    const resposta = await fetch(url, {
      headers: { "User-Agent": UA_IMAGEM, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    });
    if (!resposta.ok) throw new Error(`Falha ao baixar imagem (${resposta.status}): ${url}`);
    return Buffer.from(await resposta.arrayBuffer());
  }
  if (url.startsWith("/midia/")) {
    return readFile(path.join(RAIZ_MIDIA, url.slice("/midia/".length)));
  }
  if (url.startsWith("/")) {
    return readFile(path.join(process.cwd(), "public", url.slice(1)));
  }
  throw new Error(`URL de imagem não suportada: ${url}`);
}
