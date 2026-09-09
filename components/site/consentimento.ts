export const CHAVE_CONSENTIMENTO = "mnl-cookie-consent";
export const EVENTO_CONSENTIMENTO = "mnl-cookie-consent";

export type ValorConsentimento = "accepted" | "rejected";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
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
  // Meta Pixel não tem consent mode granular como o Google — é revoke/grant
  // geral. Nasce revogado (ver fb-pixel-consent-default em app/layout.tsx) e
  // só passa a mandar evento depois do 'grant' aqui.
  window.fbq?.("consent", valor === "accepted" ? "grant" : "revoke");
}

export function gravarConsentimento(valor: ValorConsentimento) {
  window.localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  aplicarConsentimento(valor);
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO));
}
