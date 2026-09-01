import { prisma, Destino, ModoProjeto } from "@/lib/database";

export const PADRAO_VITRINE = {
  modo: ModoProjeto.NORMAL,
  descontoMinimoPct: 20,
  tetoAcessivel: 50,
  tetoIntermediario: 150,
  cotaAcessivelPct: 40,
  quantidadeItens: 16,
  maxPorCategoria: 3,
  linkGrupoWhatsapp: null as string | null,
  linkGrupoTelegram: null as string | null,
};

export type DadosConfiguracaoVitrine = {
  modo: ModoProjeto;
  descontoMinimoPct: number;
  tetoAcessivel: number;
  tetoIntermediario: number;
  cotaAcessivelPct: number;
  quantidadeItens: number;
  maxPorCategoria: number;
  linkGrupoWhatsapp: string | null;
  linkGrupoTelegram: string | null;
};

function serializar(row: {
  modo: ModoProjeto;
  descontoMinimoPct: number;
  tetoAcessivel: unknown;
  tetoIntermediario: unknown;
  cotaAcessivelPct: number;
  quantidadeItens: number;
  maxPorCategoria: number;
  linkGrupoWhatsapp: string | null;
  linkGrupoTelegram: string | null;
}): DadosConfiguracaoVitrine {
  return {
    modo: row.modo,
    descontoMinimoPct: row.descontoMinimoPct,
    tetoAcessivel: Number(row.tetoAcessivel),
    tetoIntermediario: Number(row.tetoIntermediario),
    cotaAcessivelPct: row.cotaAcessivelPct,
    quantidadeItens: row.quantidadeItens,
    maxPorCategoria: row.maxPorCategoria,
    linkGrupoWhatsapp: row.linkGrupoWhatsapp,
    linkGrupoTelegram: row.linkGrupoTelegram,
  };
}

export async function obterConfiguracaoVitrine(destino: Destino): Promise<DadosConfiguracaoVitrine> {
  const row = await prisma.configuracaoVitrine.findUnique({ where: { destino } });
  if (!row) return { ...PADRAO_VITRINE };
  return serializar(row);
}

/** Garante a linha no banco (admin / job). Leitura pública usa só `obterConfiguracaoVitrine`. */
export async function garantirConfiguracaoVitrine(destino: Destino): Promise<DadosConfiguracaoVitrine> {
  const row = await prisma.configuracaoVitrine.upsert({
    where: { destino },
    update: {},
    create: { destino, ...PADRAO_VITRINE },
  });
  return serializar(row);
}

export async function atualizarConfiguracaoVitrine(
  destino: Destino,
  dados: DadosConfiguracaoVitrine,
): Promise<DadosConfiguracaoVitrine> {
  const row = await prisma.configuracaoVitrine.upsert({
    where: { destino },
    update: dados,
    create: { destino, ...dados },
  });
  return serializar(row);
}

export async function destinosEmModoVitrine(): Promise<Destino[]> {
  const rows = await prisma.configuracaoVitrine.findMany({
    where: { modo: ModoProjeto.VITRINE },
    select: { destino: true },
  });
  return rows.map((row) => row.destino);
}
