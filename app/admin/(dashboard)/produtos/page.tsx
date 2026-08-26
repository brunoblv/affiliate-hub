import Link from "next/link";
import { Package, Plus, Download, Search } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { descontoPercentual } from "@/lib/produtos";

const LABEL_DESTINO: Record<string, string> = {
  MEU_NOVO_LAR: "Meu Novo Lar",
  TIKTOK_SHOP: "TikTok Shop",
  UMBANDA: "Umbanda",
};

const LABEL_CATEGORIA: Record<string, string> = {
  COZINHA: "Cozinha",
  BELEZA: "Beleza",
  CASA_DECORACAO: "Casa e Decoração",
  ELETRONICOS: "Eletrônicos",
  MODA: "Moda",
  UMBANDA_RELIGIAO: "Umbanda e Religião",
  PET: "Pet",
  OUTRA: "Outra",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProdutosAdminPage() {
  const produtos = await prisma.produto.findMany({ orderBy: { criadoEm: "desc" } });

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

      {produtos.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Cadastre o primeiro produto pelo botão acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => {
              const desconto = descontoPercentual(produto);
              return (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/produtos/${produto.id}`} className="hover:underline">
                      {produto.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{produto.plataforma}</TableCell>
                  <TableCell>{LABEL_DESTINO[produto.destino] ?? produto.destino}</TableCell>
                  <TableCell>{LABEL_CATEGORIA[produto.categoria] ?? produto.categoria}</TableCell>
                  <TableCell>
                    {formatCurrency(Number(produto.precoAtual))}
                    {desconto !== null && <span className="ml-2 text-xs text-muted-foreground">-{desconto}%</span>}
                  </TableCell>
                  <TableCell>{produto.ativo ? "Ativo" : "Inativo"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
