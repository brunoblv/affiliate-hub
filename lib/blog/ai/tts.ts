/**
 * Narração do artigo com o TTS da Gemini (cota free: ~10 pedidos/dia por modelo).
 * A API devolve PCM 16-bit; embrulhamos num WAV para o <audio> do navegador.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TTS_MODELS = ["gemini-3.1-flash-tts-preview"];
const TIMEOUT_MS = 120_000;

interface TtsResponse {
  candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

class TtsHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitDepth = 16): Buffer {
  const blockAlign = channels * (bitDepth / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function narrationPrompt(script: string, voiceHint: string): string {
  return `Leia em voz alta o texto a seguir, em português do Brasil, ${voiceHint}. Não acrescente comentários, não traduza e não invente trechos.

TEXTO:
${script}`;
}

async function synthesize(model: string, script: string, voice: string, voiceHint: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini não configurado: defina GEMINI_API_KEY.");
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: narrationPrompt(script, voiceHint) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new TtsHttpError(`Gemini TTS (${model}) respondeu ${response.status}: ${body.slice(0, 300)}`, response.status);
  }
  const json = (await response.json()) as TtsResponse;
  if (json.promptFeedback?.blockReason) throw new Error(`Gemini TTS bloqueou o texto: ${json.promptFeedback.blockReason}`);
  const part = json.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error(`Gemini TTS não devolveu áudio (${json.candidates?.[0]?.finishReason ?? "sem candidatos"}).`);

  const audio = Buffer.from(part.inlineData.data, "base64");
  if (audio.length < 1000) throw new Error(`Gemini TTS (${model}) devolveu áudio vazio.`);
  const mime = part.inlineData.mimeType ?? "";
  if (/wav|wave/i.test(mime) || audio.subarray(0, 4).toString() === "RIFF") return audio;
  const rate = Number(mime.match(/rate=(\d+)/i)?.[1] ?? 24000);
  return pcmToWav(audio, rate);
}

/** WAV mono a partir do texto já limpo (ver narrationText). */
export async function generateNarration(script: string, voiceHint = "tom calmo e natural, como quem conta a própria história num podcast"): Promise<Buffer> {
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || "Sulafat";
  const models = [...new Set([process.env.GEMINI_TTS_MODEL?.trim(), ...TTS_MODELS].filter((m): m is string => !!m))];
  let last: unknown;
  for (const model of models) {
    try {
      return await synthesize(model, script, voice, voiceHint);
    } catch (error) {
      last = error;
      const switchable = error instanceof TtsHttpError ? [404, 429, 503].includes(error.status) : error instanceof Error && error.name === "TimeoutError";
      if (!switchable) throw error;
    }
  }
  throw last instanceof Error ? last : new Error("Nenhum modelo de TTS respondeu. A cota diária do plano gratuito é baixa (~10 por modelo).");
}
