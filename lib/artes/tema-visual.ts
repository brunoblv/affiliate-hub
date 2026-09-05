import type { TipoArte } from "./layouts";

/**
 * Cômodo/tema da capa — o prompt da OpenAI monta a cena em torno disso,
 * não em torno de um fundo genérico.
 */
export interface TemaVisual {
  id: string;
  rotulo: string;
  cenario: string;
}

const TEMAS: Array<TemaVisual & { termos: string[] }> = [
  {
    id: "cozinha",
    rotulo: "cozinha",
    termos: ["cozinha", "despensa", "panela", "pia", "air fryer", "tempero", "geladeira", "louça", "louca"],
    cenario:
      "a lived-in Brazilian kitchen: light wood counters, open shelves, ceramic tiles, a window with daylight, nothing luxury-showroom",
  },
  {
    id: "banheiro",
    rotulo: "banheiro",
    termos: ["banheiro", "box", "toalha", "chuveiro", "pia do banheiro", "espelho"],
    cenario: "a small Brazilian apartment bathroom: light tiles, wood accents, towels, natural light, tidy not hotel-like",
  },
  {
    id: "quarto",
    rotulo: "quarto",
    termos: ["quarto", "cama", "lençol", "lencol", "travesseiro", "cabeceira", "edredom", "guarda-roupa", "guarda roupa"],
    cenario: "a calm Brazilian bedroom: rumpled linen, wood headboard, soft daylight through curtains, lived-in not a catalog",
  },
  {
    id: "sala",
    rotulo: "sala",
    termos: ["sala", "sofá", "sofa", "estar", "tapete", "mesa de centro", "almofada"],
    cenario: "a Brazilian living room: sofa, linen cushions, a plant, warm afternoon light, compact apartment scale",
  },
  {
    id: "lavanderia",
    rotulo: "lavanderia",
    termos: ["lavanderia", "varal", "roupa suja", "tanque", "passar roupa"],
    cenario: "a compact Brazilian laundry corner: drying rack, hamper, clean tiles, practical not staged",
  },
  {
    id: "jardim",
    rotulo: "jardim",
    termos: ["jardim", "varanda", "planta", "vaso", "área externa", "area externa", "quintal"],
    cenario: "a Brazilian balcony or small garden: terracotta pots, greenery, sunlight, apartment-scale outdoor corner",
  },
  {
    id: "organizacao",
    rotulo: "organização da casa",
    termos: ["organiza", "gaveta", "despensa", "caixa", "nicho", "prateleira"],
    cenario: "inside drawers, a pantry or open shelves of a Brazilian home, tidy and useful, warm wood and cream tones",
  },
  {
    id: "limpeza",
    rotulo: "limpeza da casa",
    termos: ["limpeza", "faxina", "mop", "rodo", "balde"],
    cenario: "a Brazilian home mid-clean: tiled floor, natural light, cleaning tools as objects in a real room, not a commercial",
  },
  {
    id: "iluminacao",
    rotulo: "iluminação",
    termos: ["ilumina", "luminária", "luminaria", "abajur", "pendente", "luz"],
    cenario: "a Brazilian room at golden hour where lamps and pendants are the focus, warm cream and terracotta light",
  },
  {
    id: "moveis",
    rotulo: "móveis",
    termos: ["móvel", "movel", "compacto", "apartamento pequeno", "estante"],
    cenario: "a small Brazilian apartment with compact furniture that actually fits the room, cream walls, wood floors",
  },
  {
    id: "decoracao",
    rotulo: "decoração",
    termos: ["decora", "vaso", "quadro", "manta", "espelho"],
    cenario: "a styled but lived-in Brazilian home vignette: texture, plants, ceramics, cream and sage palette",
  },
  {
    id: "eletro",
    rotulo: "eletrodomésticos da casa",
    termos: ["eletro", "cafeteira", "liquidificador", "mixer"],
    cenario: "a Brazilian kitchen counter with small home appliances in daily use, not a product catalog",
  },
  {
    id: "ferramentas",
    rotulo: "ferramentas de casa",
    termos: ["ferramenta", "furadeira", "parafuso", "kit"],
    cenario: "a home workbench or hallway cupboard in a Brazilian apartment, practical tools, warm workshop light",
  },
];

const TEMA_CASA: TemaVisual = {
  id: "casa",
  rotulo: "casa e lar",
  cenario:
    "a warm Brazilian home interior (kitchen, living room or bedroom — pick what fits the title), cream, terracotta and sage, daylight, lived-in",
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Infere o cômodo/tema da capa a partir do título, resumo e dica da pauta. */
export function inferirTemaVisual(entrada: {
  titulo: string;
  resumo?: string | null;
  dica?: string | null;
}): TemaVisual {
  const blob = normalizar([entrada.dica, entrada.titulo, entrada.resumo].filter(Boolean).join(" "));
  for (const tema of TEMAS) {
    if (tema.termos.some((termo) => blob.includes(normalizar(termo)))) {
      return { id: tema.id, rotulo: tema.rotulo, cenario: tema.cenario };
    }
  }
  return TEMA_CASA;
}

const MOOD_POR_VARIANTE: Record<string, string> = {
  "lista:1.png": "sage green (#87947B) with a soft light circle",
  "lista:2.png": "warm cream (#F8F6F1) with a sage strip",
  "lista:3.png": "olive (#657A55) with a dark corner glow",
  "jornada:1.png": "charcoal (#292824) with an olive glow",
  "jornada:2.png": "warm cream with a terracotta strip",
  "jornada:3.png": "sand (#EDE6DA) with faint terracotta stripes",
  "produto:1.png": "terracotta gradient (#B8664F to #8F493A)",
  "produto:2.png": "charcoal with a terracotta glow",
  "produto:3.png": "sand with faint terracotta stripes",
};

export function moodDoFundo(tipo: TipoArte, arquivo: string): string {
  return MOOD_POR_VARIANTE[`${tipo}:${arquivo}`] ?? "warm cream, terracotta and sage of a Brazilian home brand";
}

export function promptDaCena(entrada: {
  tipo: TipoArte;
  titulo: string;
  tema: TemaVisual;
  mood: string;
  produtos: string[];
}): string {
  const produtos =
    entrada.produtos.length > 0
      ? `Reference photos are the real products, in this order:\n${entrada.produtos.map((nome, i) => `${i + 1}. ${nome}`).join("\n")}\nPlace those exact products in a natural montage inside the scene — on a counter, shelf, bed or table that matches the theme. Keep each product's shape, color and labels recognizable. Do not invent extra competing products. Do not make a grid, catalog collage, marketplace screenshot or floating cutouts on white.`
      : "No product photos. Invent a truthful lifestyle scene for the theme — objects that belong in that room, not a product catalog.";

  const papel =
    entrada.tipo === "lista"
      ? "editorial roundup cover for a home blog: several household products sharing one scene"
      : entrada.tipo === "produto"
        ? "single-product lifestyle cover for a home blog"
        : "editorial photography cover for a home blog article, no shopping collage";

  return [
    `Photorealistic 16:9 ${papel}.`,
    `Article title (do not render as text): "${entrada.titulo}".`,
    `Theme: ${entrada.tema.rotulo}. Scene: ${entrada.tema.cenario}.`,
    `Color grading should sit comfortably next to a brand frame in ${entrada.mood}.`,
    produtos,
    "Warm natural daylight, Brazilian apartment scale, lived-in, not a luxury ad.",
    "No people with readable faces, no text, no letters, no watermarks, no prices, no logos added, no UI, no magazine headline.",
    "Output only the photographic scene.",
  ].join("\n");
}
