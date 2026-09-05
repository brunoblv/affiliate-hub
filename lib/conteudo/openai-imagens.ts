import { withRetry } from "@/lib/integrations/retry";

/**
 * Cliente da Images API da OpenAI (ChatGPT / GPT Image) via REST — sem SDK,
 * no mesmo espírito do cliente Gemini. Usado só pra gerar a cena fotográfica
 * das capas; a identidade visual (fundo, título) continua em lib/artes.
 */

const ENDPOINT_EDITS = "https://api.openai.com/v1/images/edits";
const ENDPOINT_GERAR = "https://api.openai.com/v1/images/generations";
const TIMEOUT_MS = 90_000;
const MAX_IMAGENS = 8;

export interface ImagemDeEntrada {
  nome: string;
  buffer: Buffer;
  mime?: "image/png" | "image/jpeg" | "image/webp";
}

interface RespostaImagem {
  data?: { b64_json?: string; url?: string }[];
  error?: { message?: string };
}

function apiKeyOpenAi(): string {
  const chave = process.env.OPENAI_API_KEY?.trim();
  if (!chave) throw new Error("OPENAI_API_KEY não configurado no .env.");
  return chave;
}

function modeloDeImagem(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5";
}

function qualidadeDeImagem(): string {
  const valor = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase();
  if (valor === "low" || valor === "medium" || valor === "high" || valor === "auto") return valor;
  return "medium";
}

export function openaiImagensDisponivel(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function decodificarResposta(json: RespostaImagem, contexto: string): Buffer {
  if (json.error?.message) {
    throw new Error(`OpenAI Images (${contexto}): ${json.error.message}`);
  }
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");
  throw new Error(`OpenAI Images (${contexto}) não devolveu a imagem.`);
}

function naoRetentar(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /respondeu 400|respondeu 401|respondeu 403|não configurado/i.test(msg);
}

async function lerJson(res: Response, contexto: string): Promise<RespostaImagem> {
  const corpo = await res.text();
  let json: RespostaImagem;
  try {
    json = JSON.parse(corpo) as RespostaImagem;
  } catch {
    throw new Error(`OpenAI Images (${contexto}) respondeu ${res.status}: ${corpo.slice(0, 400)}`);
  }
  if (!res.ok) {
    const detalhe = json.error?.message || corpo.slice(0, 400);
    throw new Error(`OpenAI Images (${contexto}) respondeu ${res.status}: ${detalhe}`);
  }
  return json;
}

/** Gera uma imagem só a partir do prompt (JORNADA sem foto de produto). */
export async function gerarImagemOpenAi(prompt: string): Promise<Buffer> {
  const chave = apiKeyOpenAi();
  return withRetry(
    async () => {
      let res: Response;
      try {
        res = await fetch(ENDPOINT_GERAR, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${chave}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            model: modeloDeImagem(),
            prompt,
            n: 1,
            size: "1536x1024",
            quality: qualidadeDeImagem(),
            output_format: "png",
          }),
        });
      } catch (erro) {
        if (erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError")) {
          throw new Error("OpenAI Images não respondeu em 90s.");
        }
        throw erro;
      }
      const json = await lerJson(res, "generations");
      return decodificarResposta(json, "generations");
    },
    { maxAttempts: 2, baseDelayMs: 2000, retryIf: (erro) => !naoRetentar(erro) },
  );
}

/**
 * Edita/compõe a partir de fotos de referência (produtos, fundo). A primeira
 * imagem da lista é a que a API preserva com mais fidelidade.
 */
export async function editarImagemOpenAi(prompt: string, imagens: ImagemDeEntrada[]): Promise<Buffer> {
  if (imagens.length === 0) return gerarImagemOpenAi(prompt);
  const chave = apiKeyOpenAi();
  const usadas = imagens.slice(0, MAX_IMAGENS);

  return withRetry(
    async () => {
      const form = new FormData();
      form.append("model", modeloDeImagem());
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", "1536x1024");
      form.append("quality", qualidadeDeImagem());
      form.append("input_fidelity", "high");
      form.append("output_format", "png");
      for (const img of usadas) {
        const mime = img.mime ?? "image/jpeg";
        form.append("image", new Blob([new Uint8Array(img.buffer)], { type: mime }), img.nome);
      }

      let res: Response;
      try {
        res = await fetch(ENDPOINT_EDITS, {
          method: "POST",
          headers: { Authorization: `Bearer ${chave}` },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: form,
        });
      } catch (erro) {
        if (erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError")) {
          throw new Error("OpenAI Images não respondeu em 90s.");
        }
        throw erro;
      }
      const json = await lerJson(res, "edits");
      return decodificarResposta(json, "edits");
    },
    { maxAttempts: 2, baseDelayMs: 2000, retryIf: (erro) => !naoRetentar(erro) },
  );
}
