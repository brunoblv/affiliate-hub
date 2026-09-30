export const ALERT_RETRY_MS = 15 * 60 * 1000;
export const ALERT_SEND_TIMEOUT_MS = 5 * 60 * 1000;
export const ALERT_MAX_ATTEMPTS = 3;

/** Só retentar quando o transporte comprova que o servidor não aceitou a mensagem. */
export function mailFailure(error: unknown): { definite: boolean; code: string } {
  if (!error || typeof error !== "object") return { definite: false, code: "UNCONFIRMED" };
  const value = error as { code?: string; responseCode?: number };
  if (["EAUTH", "EDNS"].includes(value.code ?? "")) {
    return { definite: true, code: value.code! };
  }
  if (typeof value.responseCode === "number" && value.responseCode >= 400 && value.responseCode <= 599) {
    return { definite: true, code: `SMTP_${value.responseCode}` };
  }
  // Timeout/socket após DATA pode ter sido aceito. Nunca persistir a resposta bruta SMTP.
  return { definite: false, code: "UNCONFIRMED" };
}
