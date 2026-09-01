import { TAMANHO_MAXIMO_MIDIA } from "@/lib/midia/constantes";

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

  const formData = new FormData();
  formData.set("arquivo", arquivo);
  if (alt) formData.set("alt", alt);

  const resposta = await fetch("/api/admin/midia", { method: "POST", body: formData });
  const texto = await resposta.text();

  let json: (MidiaEnviada & { erro?: string }) | null = null;
  try {
    json = JSON.parse(texto) as MidiaEnviada & { erro?: string };
  } catch {
    throw new Error(
      `Falha no upload (${resposta.status}). Tente JPEG/PNG/WebP até 25 MB; se persistir, recarregue a página.`,
    );
  }

  if (!resposta.ok) throw new Error(json.erro ?? "Falha no upload");
  if (!json.id || !json.url) throw new Error("Upload incompleto: a resposta não trouxe a mídia.");
  return json;
}
