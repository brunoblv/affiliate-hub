import { withRetry } from "@/lib/integrations/retry";

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
}

interface RespostaGemini {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

function apiKey(): string {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("GEMINI_API_KEY não configurado no .env.");
  return chave;
}

function modelo(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

/** Chama a Gemini API e devolve o JSON já validado contra `schema`. */
export async function gerarJson<T>({ prompt, schema, temperature = 0.9 }: GerarJsonOptions): Promise<T> {
  return withRetry(
    async () => {
      const res = await fetch(`${ENDPOINT_BASE}/${modelo()}:generateContent?key=${apiKey()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      });

      if (!res.ok) {
        const corpo = await res.text().catch(() => "");
        throw new Error(`Gemini API respondeu ${res.status}: ${corpo.slice(0, 500)}`);
      }

      const json = (await res.json()) as RespostaGemini;

      if (json.promptFeedback?.blockReason) {
        throw new Error(`Gemini bloqueou o prompt: ${json.promptFeedback.blockReason}`);
      }

      const texto = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!texto) {
        const motivo = json.candidates?.[0]?.finishReason ?? "sem candidatos na resposta";
        throw new Error(`Gemini não retornou conteúdo (${motivo}).`);
      }

      try {
        return JSON.parse(texto) as T;
      } catch {
        throw new Error(`Gemini retornou JSON inválido: ${texto.slice(0, 300)}`);
      }
    },
    { maxAttempts: 3, baseDelayMs: 1500 },
  );
}
