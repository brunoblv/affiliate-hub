/** Capa editorial da home — usada no hero e no primeiro post enquanto ele não tem capa própria. */
export const CAPA_EDITORIAL = {
  src: "/hero-sala-aconchegante.jpg",
  alt: "Sala aconchegante com cozinha integrada, paleta Hudson Bay e iluminação quente",
} as const;

export function resolverCapa(
  capa: { url: string; alt: string | null } | null | undefined,
  fallbackEditorial = false,
) {
  if (capa?.url) return { src: capa.url, alt: capa.alt || CAPA_EDITORIAL.alt };
  if (fallbackEditorial) return { src: CAPA_EDITORIAL.src, alt: CAPA_EDITORIAL.alt };
  return null;
}
