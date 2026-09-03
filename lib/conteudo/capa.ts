import { primeiraImagem } from "@/lib/produtos";

/** Capa editorial da home — usada no hero e no primeiro post enquanto ele não tem capa própria. */
export const CAPA_EDITORIAL = {
  src: "/hero-sala-aconchegante.jpg",
  alt: "Sala aconchegante com cozinha integrada, paleta Hudson Bay e iluminação quente",
} as const;

export function resolverCapa(
  capa: { url: string; alt: string | null } | null | undefined,
  fallbackEditorial = false,
  produto?: { nome: string; imagens: unknown } | null,
) {
  if (capa?.url) return { src: capa.url, alt: capa.alt || CAPA_EDITORIAL.alt };
  const foto = produto ? primeiraImagem({ imagens: produto.imagens }) : null;
  if (foto && produto) return { src: foto, alt: produto.nome };
  if (fallbackEditorial) return { src: CAPA_EDITORIAL.src, alt: CAPA_EDITORIAL.alt };
  return null;
}
