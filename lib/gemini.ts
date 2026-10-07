/**
 * Cliente mínimo da Gemini API via REST (sem SDK). Usa responseSchema para forçar
 * saída JSON estruturada, então quem chama nunca parseia texto livre.
 *
 * Notas herdadas do uso em produção no meu-novo-lar:
 * - modelos 3.x rejeitam `thinkingBudget` e temperatura customizada (erro 400 genérico):
 *   usam `thinkingLevel`; modelos 2.5 aceitam `thinkingBudget`;
 * - sem `maxOutputTokens`, o "pensamento" consome o orçamento e o JSON sai cortado.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface GeminiResult<T> {
  data: T;
  model: string;
  usage: GeminiUsage;
}

export interface GenerateJsonOptions {
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  /**
   * Cadeia de modelos (ex.: `modelChain("article")`). Cota esgotada, modelo fora do ar ou
   * timeout passam direto para o próximo. Sem isto, usa só GEMINI_MODEL.
   */
  models?: string[];
}

export const geminiModel = () => process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

function thinkingConfig(model: string) {
  const name = model.toLowerCase();
  if (name.includes("gemini-3")) {
    return { thinkingLevel: name.includes("lite") && !name.includes("3.7") ? "minimal" : "low" };
  }
  if (name.includes("gemini-2.5")) {
    return { thinkingBudget: name.includes("pro") ? 1024 : 0 };
  }
  return undefined;
}

class GeminiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface RawResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

async function callOnce<T>(options: GenerateJsonOptions, model: string): Promise<GeminiResult<T>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini não configurado: defina GEMINI_API_KEY.");

  const isGemini3 = model.toLowerCase().includes("gemini-3");
  const thinking = thinkingConfig(model);

  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    // A chave vai em cabeçalho (não na URL) para não aparecer em logs de requisição.
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: options.prompt }] }],
      generationConfig: {
        ...(isGemini3 ? {} : { temperature: options.temperature ?? 0.4 }),
        maxOutputTokens: options.maxOutputTokens ?? 4096,
        responseMimeType: "application/json",
        responseSchema: options.schema,
        ...(thinking ? { thinkingConfig: thinking } : {}),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Nunca ecoar a chave: a mensagem da API não a contém, mas cortamos por garantia.
    throw new GeminiHttpError(`Gemini (${model}) respondeu ${response.status}: ${body.slice(0, 400)}`, response.status);
  }

  const json = (await response.json()) as RawResponse;
  if (json.promptFeedback?.blockReason) throw new Error(`Gemini bloqueou o pedido: ${json.promptFeedback.blockReason}`);

  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini não retornou conteúdo (${candidate?.finishReason ?? "sem candidatos"}).`);
  if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini cortou a resposta por limite de tokens.");

  try {
    return {
      data: JSON.parse(text) as T,
      model,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? null,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
      },
    };
  } catch {
    throw new Error("Gemini devolveu JSON inválido.");
  }
}

function isTransient(error: unknown): boolean {
  return error instanceof GeminiHttpError
    ? error.status === 429 || error.status >= 500
    : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || error.message.includes("fetch failed"));
}

/** Erros que pedem outro modelo da cadeia em vez de repetir o mesmo: cota, 404, 503, 400 de parâmetro, timeout. */
function shouldSwitchModel(error: unknown): boolean {
  if (error instanceof GeminiHttpError) {
    return error.status === 429 || error.status === 404 || error.status === 503 || (error.status === 400 && /INVALID_ARGUMENT|thinking/i.test(error.message));
  }
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function withRetries<T>(options: GenerateJsonOptions, model: string, chained: boolean): Promise<GeminiResult<T>> {
  const attempts = options.maxAttempts ?? 3;
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await callOnce<T>(options, model);
    } catch (error) {
      last = error;
      // Na cadeia, erro de cota/modelo vai direto para o próximo modelo.
      if (!isTransient(error) || (chained && shouldSwitchModel(error)) || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** (attempt - 1)));
    }
  }
  throw last;
}

/** Repete em falhas transitórias (429, 5xx, timeout); erros 4xx de pedido ruim falham na hora. */
export async function generateJson<T>(options: GenerateJsonOptions): Promise<GeminiResult<T>> {
  const chain = options.models?.length ? options.models : [geminiModel()];
  let last: unknown;
  for (const model of chain) {
    try {
      return await withRetries<T>(options, model, chain.length > 1);
    } catch (error) {
      last = error;
      if (chain.length === 1 || !shouldSwitchModel(error)) throw error;
    }
  }
  throw last;
}

// ---------------------------------------------------------------------------
// Cadeia de modelos (API free do AI Studio). IDs conferidos em ListModels; os 2.5
// saíram do ar para contas novas (404).
// ---------------------------------------------------------------------------

export type GeminiTask = "article" | "short";

const QUALITY_MODELS = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3-flash-preview"];
const VOLUME_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const RETIRED_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash-preview-tts"]);

function unique(ids: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    const name = id?.trim();
    if (!name || seen.has(name) || RETIRED_MODELS.has(name)) return [];
    seen.add(name);
    return [name];
  });
}

/** "article" tenta os modelos de qualidade primeiro; "short" prioriza os lite (mais cota diária). */
export function modelChain(task: GeminiTask): string[] {
  const configured = process.env.GEMINI_MODEL;
  if (task === "article") return unique([process.env.GEMINI_MODEL_ARTICLE, ...QUALITY_MODELS, configured, ...VOLUME_MODELS]);
  return unique([configured, ...VOLUME_MODELS, ...QUALITY_MODELS]);
}
