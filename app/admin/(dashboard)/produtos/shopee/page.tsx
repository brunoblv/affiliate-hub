import Link from "next/link";
import { prisma, Plataforma, type Produto } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { RodarDescobertaShopeeButton } from "@/components/admin/rodar-descoberta-shopee-button";
import { ConfiguracaoShopeeForm } from "@/components/admin/configuracao-shopee-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { descontoPercentual } from "@/lib/produtos";
import { inicioDoDia, formatarLocal } from "@/lib/agenda/fuso";
import { obterConfiguracao } from "@/lib/configuracao";
import { ShoppingBag } from "lucide-react";

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

function ehDescobertaAutomatica(produto: Pick<Produto, "dadosBrutos">): boolean {
  const dados = produto.dadosBrutos;
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return false;
  return (dados as { origem?: string }).origem === "descoberta_automatica";
}

function TabelaProdutos({ produtos }: { produtos: Produto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
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
  );
}

export default async function ProdutosShopeePage() {
  const [produtosShopee, ultimaDescoberta, configuracao] = await Promise.all([
    prisma.produto.findMany({ where: { plataforma: Plataforma.SHOPEE }, orderBy: { criadoEm: "desc" } }),
    prisma.log.findFirst({ where: { area: "PRODUTO_DESCOBERTA" }, orderBy: { criadoEm: "desc" } }),
    obterConfiguracao(),
  ]);

  const comecoDoDia = inicioDoDia(new Date());
  const ofertasDeHoje = produtosShopee.filter(
    (p) => ehDescobertaAutomatica(p) && p.criadoEm.getTime() >= comecoDoDia.getTime(),
  );
  const outrosProdutos = produtosShopee.filter((p) => !ofertasDeHoje.includes(p));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Produtos Shopee"
          description="Ofertas descobertas automaticamente todo dia + o resto do catálogo Shopee."
        />
        <RodarDescobertaShopeeButton />
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
          Buscar por palavra-chave
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
          <TabelaProdutos produtos={ofertasDeHoje} />
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
          <TabelaProdutos produtos={outrosProdutos} />
        )}
      </section>
    </div>
  );
}
