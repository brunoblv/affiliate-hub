import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { GerarListaWizard } from "@/components/admin/gerar-lista-wizard";
import { PAUTAS_LISTA_CASA } from "@/lib/conteudo/pauta-listas-casa";
import { contarProdutosDaPauta, produtosElegiveisParaLista } from "@/lib/conteudo/escolher-produtos-lista";
import { primeiraImagem } from "@/lib/produtos";

export const maxDuration = 180;

export default async function GerarListaPage() {
  const [produtosBrutos, pool] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { slug: true, nome: true, imagens: true },
    }),
    produtosElegiveisParaLista(),
  ]);
  const produtos = produtosBrutos.map((p) => ({ slug: p.slug, nome: p.nome, imagem: primeiraImagem(p) }));

  const contagemPorPauta: Record<string, number> = {};
  for (const pauta of PAUTAS_LISTA_CASA) {
    contagemPorPauta[pauta.id] = contarProdutosDaPauta(pauta, pool);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerar lista de produtos"
        description="Gemini escreve um post no estilo “5 produtos indispensáveis na cozinha”: utilidade de cada item + card com o link de afiliado. No Facebook vai o link deste artigo no site."
      />
      <GerarListaWizard produtos={produtos} contagemPorPauta={contagemPorPauta} />
    </div>
  );
}
