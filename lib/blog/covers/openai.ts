/**
 * Images API da OpenAI via REST (sem SDK): só gera a cena fotográfica das capas; a
 * moldura da marca e o recorte ficam em ./compose.ts.
 */
const GENERATIONS = "https://api.openai.com/v1/images/generations";
const EDITS = "https://api.openai.com/v1/images/edits";
const TIMEOUT_MS = 90_000;
const MAX_IMAGES = 8;

export interface InputImage {
  name: string;
  buffer: Buffer;
  mime?: "image/png" | "image/jpeg" | "image/webp";
}

interface ImageResponse {
  data?: { b64_json?: string }[];
  error?: { message?: string };
}

export const isOpenAiConfigured = () => Boolean(process.env.OPENAI_API_KEY?.trim());

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OpenAI não configurado: defina OPENAI_API_KEY.");
  return key;
}

const model = () => process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5";

function quality(): string {
  const value = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase();
  return value === "low" || value === "medium" || value === "high" || value === "auto" ? value : "medium";
}

class OpenAiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function readImage(response: Response, context: string): Promise<Buffer> {
  const text = await response.text();
  let json: ImageResponse;
  try {
    json = JSON.parse(text) as ImageResponse;
  } catch {
    throw new OpenAiError(`OpenAI Images (${context}) respondeu ${response.status}: ${text.slice(0, 300)}`, response.status);
  }
  if (!response.ok || json.error?.message) {
    throw new OpenAiError(`OpenAI Images (${context}) respondeu ${response.status}: ${json.error?.message ?? text.slice(0, 300)}`, response.status);
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new OpenAiError(`OpenAI Images (${context}) não devolveu a imagem.`, response.status);
  return Buffer.from(b64, "base64");
}

/** Duas tentativas; erro de pedido/credencial (400, 401, 403) falha na hora. */
async function withRetry(run: () => Promise<Buffer>): Promise<Buffer> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof OpenAiError && [400, 401, 403].includes(error.status)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return run();
  }
}

function timeoutMessage(error: unknown): never {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    throw new Error("OpenAI Images não respondeu em 90s.");
  }
  throw error;
}

/** Cena só a partir do texto (artigo sem foto de produto). */
export async function generateImage(prompt: string): Promise<Buffer> {
  const key = apiKey();
  return withRetry(async () => {
    const response = await fetch(GENERATIONS, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ model: model(), prompt, n: 1, size: "1536x1024", quality: quality(), output_format: "png" }),
    }).catch(timeoutMessage);
    return readImage(response, "generations");
  });
}

/** Cena montada a partir de fotos de referência (produtos). A primeira é a mais preservada. */
export async function editImage(prompt: string, images: InputImage[]): Promise<Buffer> {
  if (images.length === 0) return generateImage(prompt);
  const key = apiKey();
  const used = images.slice(0, MAX_IMAGES);
  return withRetry(async () => {
    const form = new FormData();
    form.append("model", model());
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", "1536x1024");
    form.append("quality", quality());
    form.append("input_fidelity", "high");
    form.append("output_format", "png");
    // Várias fotos exigem `image[]`; uma só vai em `image`.
    const field = used.length > 1 ? "image[]" : "image";
    for (const image of used) {
      form.append(field, new Blob([new Uint8Array(image.buffer)], { type: image.mime ?? "image/jpeg" }), image.name);
    }
    const response = await fetch(EDITS, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: form,
    }).catch(timeoutMessage);
    return readImage(response, "edits");
  });
}
