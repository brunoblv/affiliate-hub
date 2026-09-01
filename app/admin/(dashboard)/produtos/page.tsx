import Link from "next/link";
import { Package, Plus, Download, Search } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { descontoPercentual, LABEL_CATEGORIA } from "@/lib/produtos";
import { DistribuirNuncaPostadosButton } from "@/components/admin/distribuir-nunca-postados-button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { ProdutosTabela } from "@/components/admin/produtos-tabela";

export const maxDuration = 60;

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

  const [produtos, total] = await Promise.all([
    prisma.produto.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.produto.count(),
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

      <div className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Produtos nunca postados</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agenda de uma vez todo produto ativo que ainda não tem nenhuma publicação em nenhum canal.
        </p>
        <div className="mt-3">
          <DistribuirNuncaPostadosButton />
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
