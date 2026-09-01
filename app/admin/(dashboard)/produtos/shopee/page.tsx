import Link from "next/link";
import { prisma, Plataforma, type Produto } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { RodarDescobertaShopeeButton } from "@/components/admin/rodar-descoberta-shopee-button";
import { ConfiguracaoShopeeForm } from "@/components/admin/configuracao-shopee-form";
import { ProdutosTabela, type ProdutoLinha } from "@/components/admin/produtos-tabela";
import { descontoPercentual, LABEL_CATEGORIA } from "@/lib/produtos";
import { inicioDoDia, formatarLocal } from "@/lib/agenda/fuso";
import { obterConfiguracao } from "@/lib/configuracao";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { ShoppingBag, Search } from "lucide-react";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export const maxDuration = 60;

function ehDescobertaAutomatica(produto: Pick<Produto, "dadosBrutos">): boolean {
  const dados = produto.dadosBrutos;
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return false;
  return (dados as { origem?: string }).origem === "descoberta_automatica";
}

function paraLinha(produto: Produto): ProdutoLinha {
  return {
    id: produto.id,
    nome: produto.nome,
    plataforma: produto.plataforma,
    destino: LABEL_DESTINO[produto.destino] ?? produto.destino,
    categoria: LABEL_CATEGORIA[produto.categoria] ?? produto.categoria,
    precoAtual: Number(produto.precoAtual),
    desconto: descontoPercentual(produto),
    ativo: produto.ativo,
  };
}

export default async function ProdutosShopeePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [produtosShopee, ultimaDescoberta, configuracao] = await Promise.all([
    prisma.produto.findMany({ where: { plataforma: Plataforma.SHOPEE }, orderBy: { criadoEm: "desc" } }),
    prisma.log.findFirst({ where: { area: "PRODUTO_DESCOBERTA" }, orderBy: { criadoEm: "desc" } }),
    obterConfiguracao(),
  ]);

  const comecoDoDia = inicioDoDia(new Date());
  const ofertasDeHoje = produtosShopee.filter(
    (p) => ehDescobertaAutomatica(p) && p.criadoEm.getTime() >= comecoDoDia.getTime(),
  );
  const todosOutrosProdutos = produtosShopee.filter((p) => !ofertasDeHoje.includes(p));
  const totalPages = Math.max(1, Math.ceil(todosOutrosProdutos.length / PAGE_SIZE));
  const outrosProdutos = todosOutrosProdutos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Produtos Shopee"
          description="Ofertas descobertas automaticamente todo dia + o resto do catálogo Shopee."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/admin/produtos/buscar-shopee" />}>
            <Search />
            Buscar por cômodo
          </Button>
          <RodarDescobertaShopeeButton />
        </div>
      </div>

      <ConfiguracaoShopeeForm
        shopeeDescobertaLimiteDiario={configuracao.shopeeDescobertaLimiteDiario}
        shopeeComissaoMinimaPct={configuracao.shopeeComissaoMinimaPct}
      />

      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        {ultimaDescoberta ? (
          <>Última descoberta: {formatarLocal(ultimaDescoberta.criadoEm)} — {ultimaDescoberta.mensagem}</>
        ) : (
          "Nenhuma descoberta automática rodou ainda."
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/produtos/buscar-shopee" className="text-primary hover:underline">
          Buscar por cômodo
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/admin/produtos/importar-shopee" className="text-primary hover:underline">
          Importar por link
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ofertas de hoje</h2>
        {ofertasDeHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma oferta descoberta automaticamente hoje ainda.</p>
        ) : (
          <ProdutosTabela produtos={ofertasDeHoje.map(paraLinha)} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Outros produtos Shopee</h2>
        {outrosProdutos.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum outro produto Shopee"
            description="Produtos importados manualmente ou de dias anteriores aparecem aqui."
          />
        ) : (
          <>
            <ProdutosTabela produtos={outrosProdutos.map(paraLinha)} />
            <Pagination page={page} totalPages={totalPages} basePath="/admin/produtos/shopee" />
          </>
        )}
      </section>
    </div>
  );
}
