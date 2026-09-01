/**
 * Modelos da API free (AI Studio) que este projeto realmente usa.
 * IDs conferidos em ListModels. Quota 0/0 (Pro, imagem, Veo, Live) fica de fora.
 *
 * Texto — volume (RPD alto):
 *   gemini-3.5-flash-lite, gemini-3.1-flash-lite  → 500/dia
 *   gemini-2.5-flash-lite                         → 20/dia
 * Texto — qualidade (melhor pra artigo longo, 20/dia cada):
 *   gemini-3.7-flash, gemini-3.6-flash, gemini-3.5-flash,
 *   gemini-3-flash-preview, gemini-2.5-flash
 * TTS (10/dia cada — gerar sob demanda, não em lote):
 *   gemini-3.1-flash-tts-preview, gemini-2.5-flash-preview-tts
 */

export type TarefaGemini = "artigo" | "curto" | "tts";

const QUALIDADE_ARTIGO = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

const VOLUME_LITE = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

const TTS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];

function unicos(ids: Array<string | undefined>): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const id of ids) {
    const nome = id?.trim();
    if (!nome || vistos.has(nome)) continue;
    vistos.add(nome);
    saida.push(nome);
  }
  return saida;
}

export function apiKeyGemini(): string {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("GEMINI_API_KEY não configurado no .env.");
  return chave;
}

export function modeloPadrao(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
}

export function cadeiaDeModelos(tarefa: TarefaGemini): string[] {
  if (tarefa === "tts") {
    return unicos([process.env.GEMINI_TTS_MODEL, ...TTS]);
  }

  if (tarefa === "artigo") {
    return unicos([process.env.GEMINI_MODEL_ARTIGO, ...QUALIDADE_ARTIGO, modeloPadrao(), ...VOLUME_LITE]);
  }

  return unicos([modeloPadrao(), ...VOLUME_LITE, ...QUALIDADE_ARTIGO]);
}

export function vozTts(): string {
  return process.env.GEMINI_TTS_VOICE?.trim() || "Sulafat";
}

export function ehQuotaEsgotada(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

export function ehModeloIndisponivel(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /404|NOT_FOUND|not found|is not supported/i.test(msg);
}

export function ehIndisponivel(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /503|UNAVAILABLE|high demand/i.test(msg);
}

export function ehArgumentoInvalido(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /400/.test(msg) && /INVALID_ARGUMENT|invalid argument/i.test(msg);
}

export function ehTimeout(erro: unknown): boolean {
  if (erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError")) return true;
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /não respondeu em \d+s/i.test(msg);
}

export function ehTrocarModelo(erro: unknown): boolean {
  return (
    ehQuotaEsgotada(erro) ||
    ehModeloIndisponivel(erro) ||
    ehIndisponivel(erro) ||
    ehArgumentoInvalido(erro) ||
    ehTimeout(erro)
  );
}
