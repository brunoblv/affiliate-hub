export type SendOutcome =
  | { status: "SENT"; externalId: string }
  | { status: "FAILED" | "UNCERTAIN"; error: string }
  | { status: "RETRY"; error: string; retryAfter: number };

/** Transporte isolado: testes injetam fetch e nunca enviam mensagens reais. */
export async function sendTelegram(
  payload: { targetId: string; text: string; photo?: Buffer },
  token: string,
  request: typeof fetch = fetch,
): Promise<SendOutcome> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) return { status: "FAILED", error: "TELEGRAM_BOT_TOKEN ausente ou inválido." };
  if (payload.text.length > (payload.photo ? 1024 : 4096) || (payload.photo && payload.photo.length > 10 * 1024 * 1024)) return { status: "FAILED", error: "Conteúdo excede o limite de envio do Telegram." };
  const body = new FormData();
  body.set("chat_id", payload.targetId);
  // Sem parse_mode: dados de produto nunca viram HTML ou instruções.
  body.set(payload.photo ? "caption" : "text", payload.text);
  if (payload.photo) body.set("photo", new Blob([new Uint8Array(payload.photo)], { type: "image/jpeg" }), "capa.jpg");
  else body.set("link_preview_options", JSON.stringify({ is_disabled: true }));
  try {
    const response = await request(`https://api.telegram.org/bot${token}/${payload.photo ? "sendPhoto" : "sendMessage"}`, {
      method: "POST", body, signal: AbortSignal.timeout(20_000), redirect: "error",
    });
    const data = await response.json();
    if (response.ok && data?.ok === true && Number.isSafeInteger(data.result?.message_id)) return { status: "SENT", externalId: String(data.result.message_id) };
    if (data?.ok === false && data.error_code === 429) {
      const seconds = data.parameters?.retry_after;
      return { status: "RETRY", error: "Limite temporário do Telegram.", retryAfter: Number.isSafeInteger(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 60 };
    }
    // Só rejeições explícitas 4xx são conclusivas; não armazenar descrições que possam conter segredos.
    if (data?.ok === false && Number.isInteger(data.error_code) && data.error_code >= 400 && data.error_code < 500) return { status: "FAILED", error: `Telegram recusou o envio (código ${data.error_code}). Confira o ID e as permissões do bot.` };
    return { status: "UNCERTAIN", error: "Resposta não conclusiva do Telegram. Confira o destino antes de qualquer novo envio." };
  } catch {
    return { status: "UNCERTAIN", error: "Falha de rede ou timeout após iniciar envio. Confira no Telegram; reenvio automático bloqueado." };
  }
}
