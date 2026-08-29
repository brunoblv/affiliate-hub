/**
 * Insere parágrafos de opinião/vivência própria nos artigos JORNADA já
 * publicados, via Gemini (ver lib/conteudo/adicionar-opiniao.ts e os prompts
 * prompts/adicionar-opiniao-*.md). Dry-run por padrão: salva antes/depois de
 * cada artigo em arquivos pra revisão, sem gravar no banco. Uso:
 *
 *   npx tsx scripts/adicionar-opiniao-artigos.ts                 # dry-run
 *   npx tsx scripts/adicionar-opiniao-artigos.ts --apply         # grava
 *   npx tsx scripts/adicionar-opiniao-artigos.ts --slug=meu-post # só 1 post
 *
 * Para rodar contra produção, exportar DATABASE_URL=$PROD_DATABASE_URL antes.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/database";
import { adicionarOpiniao } from "@/lib/conteudo/adicionar-opiniao";

const PASTA_REVISAO = join(process.cwd(), "tmp", "revisao-opiniao");

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  const aplicar = process.argv.includes("--apply");
  const argSlug = process.argv.find((a) => a.startsWith("--slug="));
  const slugFiltro = argSlug?.split("=")[1];

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLICADO",
      tipo: "JORNADA",
      ...(slugFiltro ? { slug: slugFiltro } : {}),
    },
    select: { id: true, slug: true, titulo: true, resumo: true, corpo: true, categoriaEditorial: true },
    orderBy: { publicadoEm: "asc" },
  });

  if (posts.length === 0) {
    console.log("Nenhum artigo encontrado.");
    return;
  }

  console.log(`${posts.length} artigo(s). Modo: ${aplicar ? "APLICANDO no banco." : "dry-run (nada será gravado)."}`);
  if (!aplicar) await mkdir(PASTA_REVISAO, { recursive: true });
  console.log("");

  for (const post of posts) {
    process.stdout.write(`${post.slug}... `);

    try {
      const corpoRevisado = await adicionarOpiniao(post);
      const antes = contarPalavras(post.corpo);
      const depois = contarPalavras(corpoRevisado);
      console.log(`${antes} -> ${depois} palavras`);

      if (aplicar) {
        await prisma.post.update({ where: { id: post.id }, data: { corpo: corpoRevisado } });
      } else {
        const arquivo = join(PASTA_REVISAO, `${post.slug}.md`);
        await writeFile(
          arquivo,
          `# ${post.titulo}\n\n## ANTES\n\n${post.corpo}\n\n---\n\n## DEPOIS\n\n${corpoRevisado}\n`,
          "utf-8",
        );
      }
    } catch (erro) {
      console.log(`ERRO: ${erro instanceof Error ? erro.message : erro}`);
    }
  }

  console.log("");
  console.log(
    aplicar
      ? "Concluído."
      : `Dry-run concluído. Revise os arquivos em ${PASTA_REVISAO} e rode com --apply para gravar.`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
