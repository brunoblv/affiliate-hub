export const adsConfig = {
  // Activation requires a separate reviewed change with real account/slot IDs and consent integration.
  enabled: false,
  provider: "adsense",
  slots: {
    productAfterPrices: true,
    productAfterHistory: true,
  },
} as const;

const blockedRoutes = ["/admin", "/conta", "/entrar", "/login", "/cadastro", "/configuracoes", "/alertas", "/esqueci-senha"];

export function shouldShowAds(route: string, pageData: { adsEligible: boolean }): boolean {
  if (!adsConfig.enabled || !pageData.adsEligible) return false;
  return !blockedRoutes.some((blocked) => route === blocked || route.startsWith(`${blocked}/`));
}
