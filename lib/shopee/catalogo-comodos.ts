import { Categoria } from "@/lib/database/enums";

/**
 * Painel de busca Shopee: cômodo → tipo de item → keyword concreta.
 * Termos genéricos ("utensílios de cozinha", "decoração para casa") devolvem
 * lixo da API; keyword de produto específico ("jogo de cama casal") casa
 * muito melhor com o que a Shopee indexa.
 *
 * Seguro pra client component: só enum, sem Prisma/API.
 */

export type ComodoId = "quarto" | "sala" | "cozinha" | "jardim" | "banheiro" | "lavanderia";

export interface TipoItemCasa {
  id: string;
  label: string;
  keyword: string;
  categoria: Categoria;
}

export interface ComodoCasa {
  id: ComodoId;
  label: string;
  itens: TipoItemCasa[];
}

export interface ItemBusca extends TipoItemCasa {
  comodoId: ComodoId;
  comodoLabel: string;
}

export const COMODOS_CASA: ComodoCasa[] = [
  {
    id: "quarto",
    label: "Quarto",
    itens: [
      { id: "quarto-cama", label: "Roupa de cama", keyword: "jogo de cama casal", categoria: Categoria.CASA },
      { id: "quarto-organizacao", label: "Organização", keyword: "organizador de gaveta colmeia", categoria: Categoria.ORGANIZACAO },
      { id: "quarto-sapateira", label: "Sapateira e cabide", keyword: "sapateira para quarto", categoria: Categoria.ORGANIZACAO },
      { id: "quarto-abajur", label: "Abajur", keyword: "abajur de cabeceira", categoria: Categoria.ILUMINACAO },
      { id: "quarto-moveis", label: "Móveis", keyword: "criado mudo quarto", categoria: Categoria.MOVEIS },
      { id: "quarto-cortina", label: "Cortina", keyword: "cortina blackout quarto", categoria: Categoria.DECORACAO },
      { id: "quarto-decoracao", label: "Decoração", keyword: "almofada para cama casal", categoria: Categoria.DECORACAO },
    ],
  },
  {
    id: "sala",
    label: "Sala",
    itens: [
      { id: "sala-almofada", label: "Almofadas", keyword: "kit almofada decorativa sofá", categoria: Categoria.DECORACAO },
      { id: "sala-tapete", label: "Tapete", keyword: "tapete para sala", categoria: Categoria.DECORACAO },
      { id: "sala-mesa", label: "Mesa de centro", keyword: "mesa de centro pequena", categoria: Categoria.MOVEIS },
      { id: "sala-prateleira", label: "Prateleira e nicho", keyword: "nicho prateleira parede sala", categoria: Categoria.ORGANIZACAO },
      { id: "sala-luminaria", label: "Iluminação", keyword: "luminária pendente sala", categoria: Categoria.ILUMINACAO },
      { id: "sala-vaso", label: "Vaso e planta", keyword: "vaso decorativo para sala", categoria: Categoria.DECORACAO },
      { id: "sala-cortina", label: "Cortina", keyword: "cortina para sala de estar", categoria: Categoria.DECORACAO },
    ],
  },
  {
    id: "cozinha",
    label: "Cozinha",
    itens: [
      { id: "cozinha-potes", label: "Potes e despensa", keyword: "pote hermético kit cozinha", categoria: Categoria.ORGANIZACAO },
      { id: "cozinha-temperos", label: "Porta-temperos", keyword: "organizador de temperos cozinha", categoria: Categoria.ORGANIZACAO },
      { id: "cozinha-panelas", label: "Panelas", keyword: "jogo de panelas antiaderente", categoria: Categoria.COZINHA },
      { id: "cozinha-escorredor", label: "Escorredor", keyword: "escorredor de louça inox", categoria: Categoria.COZINHA },
      { id: "cozinha-utensilios", label: "Utensílios", keyword: "kit utensílios de cozinha inox", categoria: Categoria.COZINHA },
      { id: "cozinha-geladeira", label: "Geladeira", keyword: "organizador de geladeira", categoria: Categoria.ORGANIZACAO },
      { id: "cozinha-eletro", label: "Eletroportáteis", keyword: "air fryer cozinha", categoria: Categoria.ELETRODOMESTICOS },
    ],
  },
  {
    id: "jardim",
    label: "Jardim",
    itens: [
      { id: "jardim-vaso", label: "Vasos", keyword: "vaso para planta jardim", categoria: Categoria.JARDIM },
      { id: "jardim-kit", label: "Kit jardinagem", keyword: "kit ferramentas jardinagem", categoria: Categoria.JARDIM },
      { id: "jardim-luz", label: "Luz solar", keyword: "luminária solar jardim", categoria: Categoria.ILUMINACAO },
      { id: "jardim-regador", label: "Regador", keyword: "regador de plantas", categoria: Categoria.JARDIM },
      { id: "jardim-suporte", label: "Suporte para planta", keyword: "suporte para planta jardim", categoria: Categoria.JARDIM },
    ],
  },
  {
    id: "banheiro",
    label: "Banheiro",
    itens: [
      { id: "banheiro-dispenser", label: "Dispenser", keyword: "dispenser sabonete banheiro", categoria: Categoria.BANHEIRO },
      { id: "banheiro-tapete", label: "Tapete", keyword: "tapete de banheiro antideslizante", categoria: Categoria.BANHEIRO },
      { id: "banheiro-box", label: "Organizador de box", keyword: "organizador de canto box banheiro", categoria: Categoria.ORGANIZACAO },
      { id: "banheiro-toalheiro", label: "Toalheiro", keyword: "toalheiro de parede banheiro", categoria: Categoria.BANHEIRO },
      { id: "banheiro-lixeira", label: "Lixeira", keyword: "lixeira de banheiro com tampa", categoria: Categoria.BANHEIRO },
      { id: "banheiro-espelho", label: "Espelho", keyword: "espelho para banheiro", categoria: Categoria.DECORACAO },
    ],
  },
  {
    id: "lavanderia",
    label: "Lavanderia",
    itens: [
      { id: "lavanderia-cesto", label: "Cesto de roupa", keyword: "cesto de roupa suja com tampa", categoria: Categoria.LAVANDERIA },
      { id: "lavanderia-varal", label: "Varal", keyword: "varal de chão dobrável", categoria: Categoria.LAVANDERIA },
      { id: "lavanderia-organizacao", label: "Organização", keyword: "organizador de produtos de limpeza", categoria: Categoria.ORGANIZACAO },
      { id: "lavanderia-limpeza", label: "Limpeza", keyword: "kit limpeza doméstica", categoria: Categoria.LIMPEZA },
    ],
  },
];

export const LIMITE_BUSCAS_POR_VEZ = 10;

export function todosItensBusca(): ItemBusca[] {
  return COMODOS_CASA.flatMap((comodo) =>
    comodo.itens.map((item) => ({ ...item, comodoId: comodo.id, comodoLabel: comodo.label })),
  );
}

/**
 * Tipos marcados têm prioridade; senão, todos os itens dos cômodos marcados.
 * Keyword extra vira uma busca adicional (categoria do primeiro item, ou CASA).
 */
export function resolverItensBusca(
  comodoIds: string[],
  tipoIds: string[],
  keywordExtra?: string,
): ItemBusca[] {
  const todos = todosItensBusca();
  const tiposSet = new Set(tipoIds);
  const comodosSet = new Set(comodoIds);

  let selecionados =
    tiposSet.size > 0 ? todos.filter((item) => tiposSet.has(item.id)) : todos.filter((item) => comodosSet.has(item.comodoId));

  if (selecionados.length === 0 && comodosSet.size > 0) {
    selecionados = todos.filter((item) => comodosSet.has(item.comodoId));
  }

  const extra = keywordExtra?.trim();
  if (extra) {
    const ancora = selecionados[0];
    selecionados = [
      ...selecionados,
      {
        id: "busca-livre",
        label: extra,
        keyword: extra,
        categoria: ancora?.categoria ?? Categoria.CASA,
        comodoId: ancora?.comodoId ?? "quarto",
        comodoLabel: "Busca livre",
      },
    ];
  }

  return limitarItens(selecionados, LIMITE_BUSCAS_POR_VEZ);
}

/** Round-robin entre cômodos pra não buscar só o primeiro quarto quando estoura o limite. */
export function limitarItens(itens: ItemBusca[], limite: number): ItemBusca[] {
  if (itens.length <= limite) return itens;

  const grupos = new Map<string, ItemBusca[]>();
  for (const item of itens) {
    const lista = grupos.get(item.comodoId) ?? [];
    lista.push(item);
    grupos.set(item.comodoId, lista);
  }

  const saida: ItemBusca[] = [];
  let indice = 0;
  while (saida.length < limite) {
    let adicionou = false;
    for (const lista of grupos.values()) {
      const item = lista[indice];
      if (item && saida.length < limite) {
        saida.push(item);
        adicionou = true;
      }
    }
    if (!adicionou) break;
    indice++;
  }
  return saida;
}
