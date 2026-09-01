import { Destino } from "@/lib/database/enums";

export const LABEL_DESTINO: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]: "Meu Novo Lar",
  [Destino.TIKTOK_SHOP]: "Achadinhos",
  [Destino.UMBANDA]: "Umbanda",
};

/** Prefixo do slug da landing (ex.: achadinhos-2026-08-31). */
export const PREFIXO_SLUG: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]: "ofertas",
  [Destino.TIKTOK_SHOP]: "achadinhos",
  [Destino.UMBANDA]: "umbanda",
};

export const TOM_DESTINO: Record<Destino, string> = {
  [Destino.MEU_NOVO_LAR]:
    "Casa, organização e decoração. Direto e prático, como indicação de quem monta a casa — sem hype de marketplace.",
  [Destino.TIKTOK_SHOP]:
    "Achadinhos. Mais promocional e visual, mas honesto: sem falsa urgência e sem inventar vantagem.",
  [Destino.UMBANDA]:
    "Produtos de Umbanda e espiritualidade. Respeitoso, sem tom agressivo de oferta, sem reduzir o sagrado a propaganda.",
};

export const DESTINOS: Destino[] = [Destino.MEU_NOVO_LAR, Destino.TIKTOK_SHOP, Destino.UMBANDA];
