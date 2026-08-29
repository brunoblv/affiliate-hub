/**
 * Espalha publicadoEm dos posts PUBLICADO, 1 dia de diferença entre si,
 * terminando em min(hoje, maior data original) e indo pra trás — preserva a
 * ordem relativa original, nunca usa data futura, nunca deixa dois posts no
 * mesmo dia. Rodar em dry-run antes de aplicar (padrão). Uso:
 *
 *   npx tsx scripts/espalhar-datas-posts.ts           # dry-run (não grava)
 *   npx tsx scripts/espalhar-datas-posts.ts --apply   # grava de fato
 *
 * Para rodar contra produção, exportar DATABASE_URL=$PROD_DATABASE_URL antes.
 */
import "dotenv/config";
import { prisma } from "@/lib/database";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

async function main() {
  const aplicar = process.argv.includes("--apply");

  const posts = await prisma.post.findMany({
    where: { status: "PUBLICADO", tipo: "JORNADA" },
    select: { id: true, slug: true, titulo: true, publicadoEm: true, criadoEm: true },
    orderBy: [{ publicadoEm: "asc" }, { criadoEm: "asc" }],
  });

  if (posts.length === 0) {
    console.log("Nenhum post publicado encontrado.");
    return;
  }

  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const maiorDataOriginal = posts.reduce<Date>((maior, post) => {
    const data = post.publicadoEm ?? post.criadoEm;
    return data > maior ? data : maior;
  }, posts[0]!.publicadoEm ?? posts[0]!.criadoEm);

  const dataBase = maiorDataOriginal < hoje ? maiorDataOriginal : hoje;

  console.log(`${posts.length} posts publicados. Data base (mais recente): ${dataBase.toLocaleDateString("pt-BR")}`);
  console.log(aplicar ? "Modo: APLICANDO no banco." : "Modo: dry-run (nada será gravado).");
  console.log("");

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]!;
    const diasParaTras = posts.length - 1 - i;
    const novaData = new Date(dataBase.getTime() - diasParaTras * UM_DIA_MS);

    const dataAntiga = (post.publicadoEm ?? post.criadoEm).toLocaleDateString("pt-BR");
    const dataNova = novaData.toLocaleDateString("pt-BR");
    console.log(`${dataAntiga} -> ${dataNova}  ${post.slug}`);

    if (aplicar) {
      await prisma.post.update({ where: { id: post.id }, data: { publicadoEm: novaData } });
    }
  }

  console.log("");
  console.log(aplicar ? "Concluído." : "Dry-run concluído. Rode com --apply para gravar.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
