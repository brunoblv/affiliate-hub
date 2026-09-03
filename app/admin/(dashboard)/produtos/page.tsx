import Link from "next/link";
import { Package, Plus, Download, Search, House } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { descontoPercentual, LABEL_CATEGORIA } from "@/lib/produtos";
import { contarPendenciasAdsense } from "@/lib/conteudo/purgar-nicho";
import { DistribuirNuncaPostadosButton } from "@/components/admin/distribuir-nunca-postados-button";
import { EnfileirarHorariosVaziosButton } from "@/components/admin/enfileirar-horarios-vazios-button";
import { PurgarNichoAdsenseButton } from "@/components/admin/purgar-nicho-adsense-button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { ProdutosTabela } from "@/components/admin/produtos-tabela";

export const maxDuration = 120;

const LABEL_DESTINO: Record<string, string> = {
  MEU_NOVO_LAR: "Meu Novo Lar",
  TIKTOK_SHOP: "TikTok Shop",
  UMBANDA: "Umbanda",
};

export default async function ProdutosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [produtos, total, pendencias] = await Promise.all([
    prisma.produto.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.produto.count(),
    contarPendenciasAdsense(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Produtos" description="Catálogo cadastrado manualmente ou importado." />
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/admin/produtos/importar" />}>
            <Download />
            Importar do Mercado Livre
          </Button>
          <Button variant="outline" render={<Link href="/admin/produtos/buscar-shopee" />}>
            <House />
            Buscar Shopee
          </Button>
          <Button variant="outline" render={<Link href="/admin/produtos/shopee" />}>
            <Search />
            Produtos Shopee
          </Button>
          <Button render={<Link href="/admin/produtos/novo" />}>
            <Plus />
            Novo produto
          </Button>
        </div>
      </div>

      {(pendencias.foraDoNicho > 0 || pendencias.extrasDuplicados > 0) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Pendências AdSense no Meu Novo Lar</p>
          <p className="mt-1 text-muted-foreground">
            {pendencias.foraDoNicho} fora do nicho casa/lar
            {pendencias.extrasDuplicados > 0
              ? ` · ${pendencias.extrasDuplicados} duplicata(s) em ${pendencias.gruposDuplicados} grupo(s)`
              : ""}
            . O botão abaixo apaga o fora do nicho e junta o resto numa URL só.
          </p>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Fila de publicação</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Horários livres das 9h às 21h, a cada 10 minutos, no fuso de Brasília. O botão preenche só as vagas vazias — não
          substitui o que já está agendado.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <EnfileirarHorariosVaziosButton />
          <DistribuirNuncaPostadosButton />
          <PurgarNichoAdsenseButton />
        </div>
      </div>

      {produtos.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Cadastre o primeiro produto pelo botão acima." />
      ) : (
        <ProdutosTabela
          produtos={produtos.map((produto) => ({
            id: produto.id,
            nome: produto.nome,
            plataforma: produto.plataforma,
            destino: LABEL_DESTINO[produto.destino] ?? produto.destino,
            categoria: LABEL_CATEGORIA[produto.categoria] ?? produto.categoria,
            precoAtual: Number(produto.precoAtual),
            desconto: descontoPercentual(produto),
            ativo: produto.ativo,
          }))}
        />
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/produtos" />
    </div>
  );
}
