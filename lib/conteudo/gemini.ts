import { withRetry } from "@/lib/integrations/retry";
import {
  apiKeyGemini,
  cadeiaDeModelos,
  ehTrocarModelo,
  modeloPadrao,
  type TarefaGemini,
} from "@/lib/conteudo/gemini-modelos";

/**
 * Cliente mínimo da Gemini API (Google AI Studio) via REST — sem SDK, pra não
 * carregar dependência só por isso. Usa responseSchema pra forçar saída JSON
 * estruturada, então quem chama nunca precisa parsear texto livre.
 */

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GerarJsonOptions {
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  /** Teto de tokens de saída. Sem isso, o thinking do 2.5 Flash come o orçamento e o JSON sai curto. */
  maxOutputTokens?: number;
  /** "artigo" tenta Flash de qualidade primeiro; "curto" prioriza Lite (500 RPD). */
  tarefa?: Exclude<TarefaGemini, "tts">;
}

interface RespostaGemini {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

const MAX_OUTPUT_PADRAO = 16384;

type Pensamento =
  | { thinkingBudget: number }
  | { thinkingLevel: "minimal" | "low" | "medium" | "high" };

/**
 * Gemini 2.5 gasta thinking tokens contra maxOutputTokens — em JSON isso corta
 * o artigo. Flash aceita `thinkingBudget: 0`; Pro exige um mínimo.
 *
 * Gemini 3.x rejeita `thinkingBudget` (e temperature custom) com 400 genérico.
 * Usa `thinkingLevel`: lite → minimal; 3.7 Flash não aceita minimal → low.
 */
function thinkingConfig(modelo: string): Pensamento | undefined {
  const nome = modelo.toLowerCase();
  if (nome.includes("gemini-3")) {
    if (nome.includes("pro")) return { thinkingLevel: "low" };
    if (nome.includes("3.7")) return { thinkingLevel: "low" };
    if (nome.includes("lite")) return { thinkingLevel: "minimal" };
    return { thinkingLevel: "low" };
  }
  if (nome.includes("gemini-2.5")) {
    if (nome.includes("pro")) return { thinkingBudget: 1024 };
    return { thinkingBudget: 0 };
  }
  return undefined;
}

function aceitaTemperatureCustom(modelo: string): boolean {
  return !modelo.toLowerCase().includes("gemini-3");
}

async function gerarJsonNoModelo<T>({
  prompt,
  schema,
  temperature,
  maxOutputTokens,
  modelo,
  comPensamento,
  comTemperature,
}: GerarJsonOptions & { modelo: string; comPensamento: boolean; comTemperature: boolean }): Promise<T> {
  const pensamento = comPensamento ? thinkingConfig(modelo) : undefined;
  const usarTemperature = comTemperature && aceitaTemperatureCustom(modelo);

  const res = await fetch(`${ENDPOINT_BASE}/${modelo}:generateContent?key=${apiKeyGemini()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        ...(usarTemperature ? { temperature } : {}),
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
        ...(pensamento ? { thinkingConfig: pensamento } : {}),
      },
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Gemini API (${modelo}) respondeu ${res.status}: ${corpo.slice(0, 500)}`);
  }

  const json = (await res.json()) as RespostaGemini;

  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini bloqueou o prompt: ${json.promptFeedback.blockReason}`);
  }

  const candidato = json.candidates?.[0];
  const texto = candidato?.content?.parts?.[0]?.text;
  const motivo = candidato?.finishReason ?? "sem candidatos na resposta";
  if (!texto) {
    throw new Error(`Gemini não retornou conteúdo (${motivo}).`);
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(`Gemini retornou JSON inválido (${motivo}): ${texto.slice(0, 300)}`);
  }
}

/** Chama a Gemini API e devolve o JSON já validado contra `schema`. */
export async function gerarJson<T>({
  prompt,
  schema,
  temperature = 0.9,
  maxOutputTokens = MAX_OUTPUT_PADRAO,
  tarefa = "curto",
}: GerarJsonOptions): Promise<T> {
  const cadeia = cadeiaDeModelos(tarefa);
  if (cadeia.length === 0) cadeia.push(modeloPadrao());

  let ultimoErro: unknown;

  for (const modelo of cadeia) {
    try {
      return await withRetry(
        async () => {
          try {
            return await gerarJsonNoModelo<T>({
              prompt,
              schema,
              temperature,
              maxOutputTokens,
              modelo,
              comPensamento: true,
              comTemperature: true,
            });
          } catch (erro) {
            const msg = erro instanceof Error ? erro.message : String(erro);
            if (/400/.test(msg) && /thinking|INVALID_ARGUMENT|invalid argument/i.test(msg)) {
              return gerarJsonNoModelo<T>({
                prompt,
                schema,
                temperature,
                maxOutputTokens,
                modelo,
                comPensamento: false,
                comTemperature: false,
              });
            }
            throw erro;
          }
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1500,
          retryIf: (erro) => !ehTrocarModelo(erro),
        },
      );
    } catch (erro) {
      ultimoErro = erro;
      if (ehTrocarModelo(erro)) continue;
      throw erro;
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error("Nenhum modelo Gemini da cadeia free respondeu.");
}
