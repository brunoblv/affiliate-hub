/**
 * Rodada manual de descoberta (ignora DISCOVERY_ENABLED; é um pedido explícito).
 *   npm run discover            -> todas as pautas ativas
 *   npm run discover -- <id>    -> só a pauta indicada
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { runDiscovery } from "@/lib/discovery/run";

async function main() {
  const queryIds = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const summary = await runDiscovery({
    force: true,
    trigger: "manual",
    queryIds: queryIds.length ? queryIds : undefined,
    log: (message, data) => console.log(JSON.stringify({ t: new Date().toISOString(), message, ...data })),
  });
  console.log(summary);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
