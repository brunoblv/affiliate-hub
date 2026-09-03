export const CHAVE_CONSENTIMENTO = "mnl-cookie-consent";
export const EVENTO_CONSENTIMENTO = "mnl-cookie-consent";

export type ValorConsentimento = "accepted" | "rejected";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function lerConsentimento(): ValorConsentimento | null {
  if (typeof window === "undefined") return null;
  const valor = window.localStorage.getItem(CHAVE_CONSENTIMENTO);
  return valor === "accepted" || valor === "rejected" ? valor : null;
}

export function aplicarConsentimento(valor: ValorConsentimento) {
  window.gtag?.("consent", "update", {
    analytics_storage: valor === "accepted" ? "granted" : "denied",
    ad_storage: valor === "accepted" ? "granted" : "denied",
    ad_user_data: valor === "accepted" ? "granted" : "denied",
    ad_personalization: valor === "accepted" ? "granted" : "denied",
  });
}

export function gravarConsentimento(valor: ValorConsentimento) {
  window.localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  aplicarConsentimento(valor);
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO));
}
