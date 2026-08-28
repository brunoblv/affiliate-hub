import { prisma } from "@/lib/database";

const ID_CONFIGURACAO = "app";

const PADRAO = {
  shopeeDescobertaLimiteDiario: 15,
  shopeeComissaoMinimaPct: 10,
};

/** Cria a linha única de configuração com os padrões, se ainda não existir. */
export async function obterConfiguracao() {
  return prisma.configuracao.upsert({
    where: { id: ID_CONFIGURACAO },
    update: {},
    create: { id: ID_CONFIGURACAO, ...PADRAO },
  });
}

export async function atualizarConfiguracao(dados: {
  shopeeDescobertaLimiteDiario: number;
  shopeeComissaoMinimaPct: number;
}) {
  return prisma.configuracao.upsert({
    where: { id: ID_CONFIGURACAO },
    update: dados,
    create: { id: ID_CONFIGURACAO, ...dados },
  });
}
