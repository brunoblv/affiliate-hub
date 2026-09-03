/**
 * Adequação AdSense: apaga produtos fora do nicho casa/lar do Meu Novo Lar
 * e consolida duplicatas (mesmo título → uma URL, sem -2/-3).
 *
 * Uso (no servidor, com DATABASE_URL de produção):
 *   npx tsx scripts/purgar-fora-do-nicho.ts
 *
 * No admin: Produtos → "Purgar fora do nicho (AdSense)".
 */
import "dotenv/config";
import { prisma } from "@/lib/database";
import { HOME_CATEGORIAS } from "@/lib/produtos";
import { purgarForaDoNichoEDuplicatas } from "@/lib/conteudo/purgar-nicho";

async function main() {
  const resultado = await purgarForaDoNichoEDuplicatas();
  console.log(`Fora do nicho apagados: ${resultado.foraDoNicho}`);
  for (const p of resultado.amostrasFora) {
    console.log(`  - [${p.plataforma}/${p.categoria}] ${p.slug} — ${p.nome}`);
  }
  console.log(`Duplicatas consolidadas: ${resultado.duplicatas}`);
  console.log("Categorias casa restantes:", HOME_CATEGORIAS.join(", "));
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
