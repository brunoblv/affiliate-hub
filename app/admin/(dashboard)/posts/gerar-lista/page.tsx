import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { GerarListaWizard } from "@/components/admin/gerar-lista-wizard";
import { PAUTAS_LISTA_CASA } from "@/lib/conteudo/pauta-listas-casa";
import { contarProdutosDaPauta, produtosElegiveisParaLista } from "@/lib/conteudo/escolher-produtos-lista";

export const maxDuration = 60;

export default async function GerarListaPage() {
  const [produtos, pool] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { slug: true, nome: true },
    }),
    produtosElegiveisParaLista(),
  ]);

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
