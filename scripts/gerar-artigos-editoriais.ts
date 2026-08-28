import "dotenv/config";
import { prisma, StatusPost, TipoPost } from "@/lib/database";
import { gerarTemasEditoriais } from "@/lib/conteudo/pauta-editorial";
import { gerarArtigoEditorial } from "@/lib/conteudo/gerar-artigo-editorial";
import { slugDePostLivre } from "@/lib/conteudo/slug";

/**
 * Gera N artigos editoriais (tipo JORNADA) via Gemini e salva como RASCUNHO
 * — nada vai pro ar sem passar por /admin/posts antes.
 *
 * Uso (na pasta Sistema-afiliados):
 *   npm run conteudo:gerar-artigos -- 5
 */
async function main() {
  const quantidade = Math.max(1, Number(process.argv[2]) || 5);

  console.log(`Pedindo ${quantidade} tema(s) novo(s) ao Gemini...`);
  const temas = await gerarTemasEditoriais(quantidade);

  if (temas.length === 0) {
    console.log("Nenhum tema novo veio de volta (tudo colidiu com títulos existentes). Tente rodar de novo.");
    return;
  }

  if (temas.length < quantidade) {
    console.log(`Só ${temas.length} de ${quantidade} temas passaram na checagem de duplicidade.`);
  }

  for (const tema of temas) {
    console.log(`\n→ "${tema.titulo}"`);
    try {
      const artigo = await gerarArtigoEditorial(tema);
      const slug = await slugDePostLivre(artigo.titulo);

      const post = await prisma.post.create({
        data: {
          tipo: TipoPost.JORNADA,
          titulo: artigo.titulo,
          slug,
          resumo: artigo.resumo,
          corpo: artigo.corpo,
          seoTitulo: artigo.seoTitulo || null,
          metaDescricao: artigo.metaDescricao || null,
          status: StatusPost.RASCUNHO,
        },
        select: { id: true, slug: true },
      });

      console.log(`  ✓ rascunho criado — /admin/posts/${post.id}`);
    } catch (erro) {
      console.error(`  ✗ falhou: ${erro instanceof Error ? erro.message : erro}`);
    }
  }

  console.log("\nRevise e publique os rascunhos em /admin/posts antes que eles apareçam no site.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
