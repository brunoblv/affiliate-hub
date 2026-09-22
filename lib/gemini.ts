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

/** Repete em falhas transitórias (429, 5xx, timeout); erros 4xx de pedido ruim falham na hora. */
export async function generateJson<T>(options: GenerateJsonOptions): Promise<GeminiResult<T>> {
  const model = geminiModel();
  const attempts = options.maxAttempts ?? 3;
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await callOnce<T>(options, model);
    } catch (error) {
      last = error;
      const transient =
        error instanceof GeminiHttpError
          ? error.status === 429 || error.status >= 500
          : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || error.message.includes("fetch failed"));
      if (!transient || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** (attempt - 1)));
    }
  }
  throw last;
}
