import { TAMANHO_MAXIMO_MIDIA } from "@/lib/midia/constantes";
import { comprimirImagemParaUpload } from "@/lib/midia/comprimir-cliente";

export type MidiaEnviada = {
  id: string;
  url: string;
  alt: string | null;
  markdown?: string;
};

export async function enviarArquivoDeMidia(arquivo: File, alt?: string): Promise<MidiaEnviada> {
  if (arquivo.size > TAMANHO_MAXIMO_MIDIA) {
    throw new Error("Arquivo acima de 25 MB.");
  }

  const compactado = await comprimirImagemParaUpload(arquivo);

  const formData = new FormData();
  formData.set("arquivo", compactado);
  if (alt) formData.set("alt", alt);

  const resposta = await fetch("/api/admin/midia", { method: "POST", body: formData });
  const texto = await resposta.text();

  let json: (MidiaEnviada & { erro?: string }) | null = null;
  try {
    json = JSON.parse(texto) as MidiaEnviada & { erro?: string };
  } catch {
    if (resposta.status === 413) {
      throw new Error(
        "O servidor recusou o arquivo (HTTP 413). No Nginx o padrão é 1 MB — no servidor, em http { } ou no server do site, use client_max_body_size 30m;",
      );
    }
    throw new Error(
      `Falha no upload (${resposta.status}). Tente JPEG/PNG/WebP; se persistir, recarregue a página.`,
    );
  }

  if (!resposta.ok) throw new Error(json.erro ?? "Falha no upload");
  if (!json.id || !json.url) throw new Error("Upload incompleto: a resposta não trouxe a mídia.");
  return json;
}
