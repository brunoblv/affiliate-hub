import "dotenv/config";
import { prisma, StatusPost, TipoPost, CategoriaEditorial } from "@/lib/database";
import { gerarTemasEditoriais } from "@/lib/conteudo/pauta-editorial";
import { gerarArtigoEditorial } from "@/lib/conteudo/gerar-artigo-editorial";
import { slugDePostLivre } from "@/lib/conteudo/slug";

const CATEGORIA_POR_ARGUMENTO: Record<string, CategoriaEditorial> = {
  "dicas-casa": CategoriaEditorial.DICAS_CASA,
  "jornada-apartamento": CategoriaEditorial.JORNADA_APARTAMENTO,
};

function lerCategoria(argumento: string | undefined): CategoriaEditorial {
  if (!argumento) return CategoriaEditorial.DICAS_CASA;
  const categoria = CATEGORIA_POR_ARGUMENTO[argumento];
  if (!categoria) {
    throw new Error(`Categoria "${argumento}" inválida. Use "dicas-casa" ou "jornada-apartamento".`);
  }
  return categoria;
}

/**
 * Gera N artigos editoriais (tipo JORNADA) via Gemini e salva como RASCUNHO
 * — nada vai pro ar sem passar por /admin/posts antes.
 *
 * Uso (na pasta Sistema-afiliados):
 *   npm run conteudo:gerar-artigos -- 5
 *   npm run conteudo:gerar-artigos -- 5 dicas-casa
 *   npm run conteudo:gerar-artigos -- 5 jornada-apartamento
 */
async function main() {
  const quantidade = Math.max(1, Number(process.argv[2]) || 5);
  const categoria = lerCategoria(process.argv[3]);

  console.log(`Pedindo ${quantidade} tema(s) novo(s) ao Gemini (categoria: ${categoria})...`);
  const temas = await gerarTemasEditoriais(quantidade, categoria);

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
      const artigo = await gerarArtigoEditorial(tema, categoria);
      const slug = await slugDePostLivre(artigo.titulo);

      const post = await prisma.post.create({
        data: {
          tipo: TipoPost.JORNADA,
          categoriaEditorial: categoria,
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
