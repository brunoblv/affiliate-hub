export const TAMANHO_MAXIMO_MIDIA = 25 * 1024 * 1024; // 25 MB
export const LARGURA_MAXIMA_MIDIA = 1600;
export const TIPOS_ACEITOS_MIDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const TIPO_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** MIME real, ou fallback pela extensão (Windows às vezes manda type vazio). */
export function tipoDeImagem(arquivo: { type: string; name: string }): string | null {
  if (arquivo.type === "image/jpg") return "image/jpeg";
  if (TIPOS_ACEITOS_MIDIA.has(arquivo.type)) return arquivo.type;
  const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  return TIPO_POR_EXTENSAO[ext] ?? null;
}

export function ehArquivoEnviado(valor: unknown): valor is File {
  return (
    typeof valor === "object" &&
    valor !== null &&
    typeof (valor as File).arrayBuffer === "function" &&
    typeof (valor as File).size === "number" &&
    typeof (valor as File).name === "string"
  );
}
