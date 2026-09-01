import { withRetry } from "@/lib/integrations/retry";
import {
  apiKeyGemini,
  cadeiaDeModelos,
  ehTrocarModelo,
  vozTts,
} from "@/lib/conteudo/gemini-modelos";

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface ParteAudio {
  inlineData?: { mimeType?: string; data?: string };
  text?: string;
}

interface RespostaTts {
  candidates?: {
    content?: { parts?: ParteAudio[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

export interface AudioGerado {
  wav: Buffer;
  modelo: string;
  voz: string;
}

function pcmParaWav(pcm: Buffer, sampleRate: number, channels = 1, bitDepth = 16): Buffer {
  const blockAlign = channels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function sampleRateDoMime(mimeType: string | undefined): number {
  const casamento = mimeType?.match(/rate=(\d+)/i);
  return casamento ? Number(casamento[1]) : 24000;
}

function promptDeNarracao(script: string): string {
  return `Leia em voz alta o texto a seguir, em português do Brasil, tom calmo e natural, como quem conta a própria história num podcast sobre casa e mudança. Não acrescente comentários, não traduza e não invente trechos.

TEXTO:
${script}`;
}

async function gerarPcmNoModelo(
  modelo: string,
  script: string,
  voz: string,
): Promise<{ pcm: Buffer; sampleRate: number; mimeType: string }> {
  const res = await fetch(`${ENDPOINT_BASE}/${modelo}:generateContent?key=${apiKeyGemini()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptDeNarracao(script) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voz },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Gemini TTS (${modelo}) respondeu ${res.status}: ${corpo.slice(0, 500)}`);
  }

  const json = (await res.json()) as RespostaTts;

  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini TTS bloqueou o prompt: ${json.promptFeedback.blockReason}`);
  }

  const parte = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const data = parte?.inlineData?.data;
  if (!data) {
    const motivo = json.candidates?.[0]?.finishReason ?? "sem áudio na resposta";
    throw new Error(`Gemini TTS não retornou áudio (${motivo}).`);
  }

  return {
    pcm: Buffer.from(data, "base64"),
    sampleRate: sampleRateDoMime(parte?.inlineData?.mimeType),
    mimeType: parte?.inlineData?.mimeType ?? "",
  };
}

/** Gera WAV mono 16-bit a partir do script, tentando os TTS free (3.1 → 2.5). */
export async function gerarAudioTts(script: string): Promise<AudioGerado> {
  const voz = vozTts();
  const cadeia = cadeiaDeModelos("tts");
  let ultimoErro: unknown;

  for (const modelo of cadeia) {
    try {
      const { pcm, sampleRate, mimeType } = await withRetry(() => gerarPcmNoModelo(modelo, script, voz), {
        maxAttempts: 2,
        baseDelayMs: 2000,
        retryIf: (erro) => !ehTrocarModelo(erro),
      });

      if (pcm.length < 1000) {
        throw new Error(`Gemini TTS (${modelo}) devolveu áudio vazio.`);
      }

      const jaEWav = /wav|wave/i.test(mimeType) || pcm.subarray(0, 4).toString() === "RIFF";
      return {
        wav: jaEWav ? pcm : pcmParaWav(pcm, sampleRate),
        modelo,
        voz,
      };
    } catch (erro) {
      ultimoErro = erro;
      if (ehTrocarModelo(erro)) continue;
      throw erro;
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error("Nenhum modelo TTS da API free respondeu. Cota diária é 10 pedidos por modelo.");
}
