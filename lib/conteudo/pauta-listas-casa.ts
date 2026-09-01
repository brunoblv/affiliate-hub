import { Categoria } from "@/lib/database/enums";
import type { ComodoId } from "@/lib/shopee/catalogo-comodos";

/**
 * Pautas de post tipo LISTA: "5 produtos indispensáveis na cozinha" e
 * variações por cômodo/tema. Seguro pra client — só enum, sem Prisma.
 */

export interface PautaListaCasa {
  id: string;
  grupo: "comodo" | "tema";
  comodoId?: ComodoId;
  titulo: string;
  angulo: string;
  categorias: Categoria[];
  /** Nomes que "parecem" do cômodo/tema — prioridade na escolha. */
  termosNome: string[];
  quantidade: number;
  preferirPromocao: boolean;
  avisoSeguranca: boolean;
}

export const PAUTAS_LISTA_CASA: PautaListaCasa[] = [
  {
    id: "quarto-indispensaveis",
    grupo: "comodo",
    comodoId: "quarto",
    titulo: "5 produtos indispensáveis no quarto",
    angulo:
      "O que realmente muda o quarto no dia a dia: dormir melhor, guardar roupa e deixar o espaço mais calmo — não decoração de revista.",
    categorias: [Categoria.CASA, Categoria.ORGANIZACAO, Categoria.ILUMINACAO, Categoria.MOVEIS, Categoria.DECORACAO],
    termosNome: ["cama", "lençol", "lencol", "edredom", "travesseiro", "cabeceira", "criado", "gaveta", "sapateira", "cabide", "abajur", "blackout", "cortina", "almofada", "cômoda", "comoda", "guarda"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "sala-indispensaveis",
    grupo: "comodo",
    comodoId: "sala",
    titulo: "5 produtos indispensáveis na sala",
    angulo:
      "Itens que deixam a sala usável e acolhedora: sentar, apoiar, iluminar e organizar o que vive espalhado — sem shopping de móveis inteiro.",
    categorias: [Categoria.DECORACAO, Categoria.MOVEIS, Categoria.ILUMINACAO, Categoria.ORGANIZACAO],
    termosNome: ["sofá", "sofa", "almofada", "tapete", "mesa de centro", "prateleira", "nicho", "pendente", "luminária", "luminaria", "vaso", "cortina", "aparador"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "cozinha-indispensaveis",
    grupo: "comodo",
    comodoId: "cozinha",
    titulo: "5 produtos indispensáveis na cozinha",
    angulo:
      "O kit que faz a cozinha funcionar de verdade: guardar comida, cozinhar sem improviso e manter a pia/despensa usáveis no dia a dia.",
    categorias: [Categoria.COZINHA, Categoria.ORGANIZACAO, Categoria.ELETRODOMESTICOS],
    termosNome: ["panela", "pote", "hermét", "hermet", "tempero", "escorredor", "utensílio", "utensilio", "geladeira", "air fryer", "fruteira", "tabua", "tábua", "faca", "jogo de"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "jardim-indispensaveis",
    grupo: "comodo",
    comodoId: "jardim",
    titulo: "5 produtos indispensáveis no jardim",
    angulo:
      "O básico pra planta sobreviver e o canto externo ficar bonito: vaso certo, água, luz e suporte — sem virar loja de jardinagem.",
    categorias: [Categoria.JARDIM, Categoria.ILUMINACAO],
    termosNome: ["vaso", "planta", "jardim", "regador", "solar", "suporte", "jardinagem", "mangueira", "terra"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "banheiro-indispensaveis",
    grupo: "comodo",
    comodoId: "banheiro",
    titulo: "5 produtos indispensáveis no banheiro",
    angulo:
      "O que deixa o banheiro organizado e menos escorregadio: toalha no lugar, box usável e o chão que não vira armadilha.",
    categorias: [Categoria.BANHEIRO, Categoria.ORGANIZACAO, Categoria.DECORACAO],
    termosNome: ["banheiro", "dispenser", "sabonete", "tapete", "box", "toalheiro", "toalha", "lixeira", "espelho", "papel higiênico", "higiênico"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "lavanderia-indispensaveis",
    grupo: "comodo",
    comodoId: "lavanderia",
    titulo: "5 produtos indispensáveis na lavanderia",
    angulo:
      "O fluxo de roupa suja → lavar → secar sem bagunça no corredor: cesto, varal e um jeito de guardar produto de limpeza.",
    categorias: [Categoria.LAVANDERIA, Categoria.ORGANIZACAO, Categoria.LIMPEZA],
    termosNome: ["cesto", "roupa suja", "varal", "lavanderia", "passar", "pregador", "limpeza"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "organizadores-funcionam",
    grupo: "tema",
    titulo: "5 organizadores que realmente funcionam",
    angulo:
      "Organizador não é caixa bonita: é o que a pessoa usa todo dia. Foque em gaveta, despensa, box e o que some da bancada.",
    categorias: [Categoria.ORGANIZACAO],
    termosNome: ["organizador", "caixa", "cesto", "prateleira", "nicho", "gancho", "divisória", "divisoria", "colmeia"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "promocao-casa",
    grupo: "tema",
    titulo: "5 achados em promoção para a casa",
    angulo:
      "Seleção de itens de casa que estão com desconto de verdade. Explique a utilidade, não o 'desconto relâmpago'.",
    categorias: [
      Categoria.CASA,
      Categoria.ORGANIZACAO,
      Categoria.COZINHA,
      Categoria.BANHEIRO,
      Categoria.DECORACAO,
      Categoria.ILUMINACAO,
      Categoria.MOVEIS,
      Categoria.JARDIM,
      Categoria.ELETRODOMESTICOS,
      Categoria.LAVANDERIA,
      Categoria.LIMPEZA,
    ],
    termosNome: [],
    quantidade: 5,
    preferirPromocao: true,
    avisoSeguranca: false,
  },
  {
    id: "limpeza-essencial",
    grupo: "tema",
    titulo: "5 itens de limpeza que valem a pena ter em casa",
    angulo:
      "O que reduz retrabalho na faxina sem virar armário de produto químico. Seja sóbrio: sem claim de saúde ou 'elimina 99%'.",
    categorias: [Categoria.LIMPEZA],
    termosNome: ["limpeza", "rodo", "mop", "balde", "luva", "escova", "pano", "desinfet"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: true,
  },
  {
    id: "eletro-dia-a-dia",
    grupo: "tema",
    titulo: "5 eletrodomésticos úteis no dia a dia",
    angulo:
      "Eletro que poupa tempo de verdade na rotina da casa — não o gadget que vira enfeite na bancada.",
    categorias: [Categoria.ELETRODOMESTICOS],
    termosNome: ["air fryer", "cafeteira", "liquidificador", "mixer", "sanduicheira", "grill", "panela elétrica", "eletro"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "iluminacao-ambiente",
    grupo: "tema",
    titulo: "5 peças de iluminação que mudam o ambiente",
    angulo:
      "Luz certa muda mais que quadro na parede: cabeceira, sala e o canto que fica escuro à noite.",
    categorias: [Categoria.ILUMINACAO],
    termosNome: ["luminária", "luminaria", "abajur", "pendente", "spot", "fita de led", "solar", "lustre"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "moveis-compactos",
    grupo: "tema",
    titulo: "5 móveis compactos para apartamento pequeno",
    angulo:
      "Móvel que cabe e ainda guarda coisa: o critério é espaço real de apartamento, não sala de revista.",
    categorias: [Categoria.MOVEIS],
    termosNome: ["compacto", "estreito", "pequeno", "dobrável", "dobravel", "multiuso", "canto", "nicho", "prateleira", "mesa"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
  {
    id: "decoracao-barata",
    grupo: "tema",
    titulo: "5 itens de decoração que não pesam no bolso",
    angulo:
      "Decoração que dá cara de casa pronta sem reforma: textura, luz e um objeto que ancora o cômodo.",
    categorias: [Categoria.DECORACAO],
    termosNome: ["almofada", "vaso", "quadro", "tapete", "cortina", "manta", "espelho", "porta-retrato"],
    quantidade: 5,
    preferirPromocao: true,
    avisoSeguranca: false,
  },
  {
    id: "ferramentas-casa",
    grupo: "tema",
    titulo: "5 ferramentas que todo mundo deveria ter em casa",
    angulo:
      "O kit mínimo pra não chamar alguém por parafuso frouxo, quadro torto e prateleira que não sobe.",
    categorias: [Categoria.FERRAMENTAS],
    termosNome: ["furadeira", "chave", "alicate", "martelo", "trena", "nível", "nivel", "kit ferramentas", "parafuso"],
    quantidade: 5,
    preferirPromocao: false,
    avisoSeguranca: false,
  },
];

export function pautaListaPorId(id: string): PautaListaCasa | undefined {
  return PAUTAS_LISTA_CASA.find((pauta) => pauta.id === id);
}

export function pautasDeComodo(): PautaListaCasa[] {
  return PAUTAS_LISTA_CASA.filter((pauta) => pauta.grupo === "comodo");
}

export function pautasTematicas(): PautaListaCasa[] {
  return PAUTAS_LISTA_CASA.filter((pauta) => pauta.grupo === "tema");
}
