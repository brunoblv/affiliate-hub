/**
 * Ajusta o intervalo mínimo entre publicações de um canal específico.
 *
 * Uso (no servidor, com DATABASE_URL de produção):
 *   npx tsx scripts/ajustar-intervalo-canal.ts <idExterno> <minutos> [rede]
 *
 * Exemplo (página do Facebook 1303950226131311, de volta pra 10 em 10 min):
 *   npx tsx scripts/ajustar-intervalo-canal.ts 1303950226131311 10
 *
 * `rede` é opcional — default FACEBOOK_PAGE. Só existe pra desempate caso o
 * mesmo idExterno apareça em mais de uma rede (não deveria, mas o schema
 * permite — @@unique é [rede, idExterno], não idExterno sozinho).
 */
import "dotenv/config";
import { prisma, Rede } from "@/lib/database";

async function main() {
  const [idExterno, minutosRaw, redeRaw] = process.argv.slice(2);
  const minutos = Number(minutosRaw);
  const rede = (redeRaw as Rede | undefined) ?? Rede.FACEBOOK_PAGE;

  if (!idExterno || !Number.isInteger(minutos) || minutos < 1) {
    console.error("Uso: npx tsx scripts/ajustar-intervalo-canal.ts <idExterno> <minutos> [rede]");
    process.exit(1);
  }
  if (!Object.values(Rede).includes(rede)) {
    console.error(`Rede inválida: ${rede}. Valores aceitos: ${Object.values(Rede).join(", ")}`);
    process.exit(1);
  }

  const canal = await prisma.canal.findUnique({ where: { rede_idExterno: { rede, idExterno } } });
  if (!canal) {
    console.error(`Nenhum canal ${rede} com idExterno "${idExterno}" encontrado.`);
    process.exit(1);
  }

  console.log(`Canal encontrado: "${canal.nome}" (${canal.rede}) — intervaloMinimoMin atual: ${canal.intervaloMinimoMin}`);

  if (canal.intervaloMinimoMin === minutos) {
    console.log("Já está nesse valor — nada a fazer.");
    return;
  }

  await prisma.canal.update({ where: { id: canal.id }, data: { intervaloMinimoMin: minutos } });
  console.log(`Atualizado: intervaloMinimoMin ${canal.intervaloMinimoMin} → ${minutos}.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
