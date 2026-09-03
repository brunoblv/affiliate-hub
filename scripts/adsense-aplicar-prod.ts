/**
 * Adequação AdSense no Postgres da VPS (túnel PROD_DATABASE_URL → :5434).
 *
 *   npx tsx scripts/adsense-aplicar-prod.ts contar
 *   npx tsx scripts/adsense-aplicar-prod.ts purgar
 *   npx tsx scripts/adsense-aplicar-prod.ts vitrine
 */
import { config } from "dotenv";

config();

if (!process.env.PROD_DATABASE_URL) {
  console.error("PROD_DATABASE_URL ausente no .env");
  process.exit(1);
}
process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;

const passo = process.argv[2] ?? "contar";

async function main() {
  const { prisma, Destino, StatusLanding } = await import("@/lib/database");
  const { contarPendenciasAdsense, purgarForaDoNichoEDuplicatas } = await import("@/lib/conteudo/purgar-nicho");

  const total = await prisma.produto.count({ where: { destino: Destino.MEU_NOVO_LAR } });
  const pendencias = await contarPendenciasAdsense();
  const lencol = await prisma.produto.count({
    where: { destino: Destino.MEU_NOVO_LAR, nome: { contains: "lençol de time", mode: "insensitive" } },
  });
  const secalux = await prisma.produto.count({
    where: { destino: Destino.MEU_NOVO_LAR, nome: { contains: "secalux", mode: "insensitive" } },
  });
  const landings = await prisma.landingDiaria.findMany({
    where: { destino: Destino.MEU_NOVO_LAR, status: StatusLanding.PUBLICADA },
    orderBy: { data: "desc" },
    take: 3,
    select: { slug: true, data: true, headline: true },
  });

  console.log(JSON.stringify({ passo, totalMnl: total, pendencias, lencolDeTime: lencol, secalux, landings }, null, 2));

  if (passo === "contar") return;

  if (passo === "purgar") {
    const resultado = await purgarForaDoNichoEDuplicatas();
    console.log(
      JSON.stringify(
        {
          foraDoNicho: resultado.foraDoNicho,
          duplicatas: resultado.duplicatas,
          amostrasFora: resultado.amostrasFora.slice(0, 20),
        },
        null,
        2,
      ),
    );
    const depois = await contarPendenciasAdsense();
    const secaluxDepois = await prisma.produto.count({
      where: { destino: Destino.MEU_NOVO_LAR, nome: { contains: "secalux", mode: "insensitive" } },
    });
    const lencolDepois = await prisma.produto.count({
      where: { destino: Destino.MEU_NOVO_LAR, nome: { contains: "lençol de time", mode: "insensitive" } },
    });
    console.log(JSON.stringify({ pendenciasDepois: depois, secaluxDepois, lencolDepois }));
    return;
  }

  if (passo === "vitrine") {
    const { gerarLandingDoDestino } = await import("@/lib/vitrine/gerar");
    const resultado = await gerarLandingDoDestino(Destino.MEU_NOVO_LAR, { forcar: true });
    console.log(
      JSON.stringify(
        {
          status: resultado.status,
          slug: resultado.slug,
          quantidadeItens: resultado.quantidadeItens,
          motivo: resultado.motivo,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.error("Passo inválido. Use contar | purgar | vitrine");
  process.exit(1);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/database");
    await prisma.$disconnect();
  });
