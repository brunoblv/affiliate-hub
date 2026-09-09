import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { RelatorioConversaoFiltros } from "@/components/admin/relatorio-conversao-filtros";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reais } from "@/lib/vitrine/rotulos";
import { buscarConversoesDoPeriodo, agregarRelatorioConversao } from "@/lib/shopee/relatorio-conversao";
import { BarChart3 } from "lucide-react";

export const maxDuration = 60;

const STATUS_VALIDOS = new Set(["ALL", "COMPLETED", "PENDING", "UNPAID", "CANCELLED"]);

function paraDataISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function inicioDoDiaUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function fimDoDiaUTC(iso: string): Date {
  return new Date(`${iso}T23:59:59.999Z`);
}

export default async function RelatorioConversaoShopeePage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; orderStatus?: string }>;
}) {
  const params = await searchParams;

  const hoje = new Date();
  const seteDiasAtras = new Date(hoje.getTime() - 6 * 24 * 60 * 60 * 1000);
  const inicio = params.inicio || paraDataISO(seteDiasAtras);
  const fim = params.fim || paraDataISO(hoje);
  const orderStatus = params.orderStatus && STATUS_VALIDOS.has(params.orderStatus) ? params.orderStatus : "ALL";

  const semCredenciais = !process.env.SHOPEE_APP_ID || !process.env.SHOPEE_SECRET;

  let erro: string | null = null;
  let relatorio: ReturnType<typeof agregarRelatorioConversao> | null = null;

  if (!semCredenciais) {
    try {
      const nodes = await buscarConversoesDoPeriodo({
        inicio: inicioDoDiaUTC(inicio),
        fim: fimDoDiaUTC(fim),
        orderStatus: orderStatus as "ALL" | "COMPLETED" | "PENDING" | "UNPAID" | "CANCELLED",
      });
      relatorio = agregarRelatorioConversao(nodes);
    } catch (e) {
      erro = e instanceof Error ? e.message : "Falha ao buscar o relatório da Shopee.";
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Conversão Shopee"
        description="Comissão validada por produto e por canal, direto da Affiliate Open API — não é estimativa."
      />

      <RelatorioConversaoFiltros inicio={inicio} fim={fim} orderStatus={orderStatus} />

      {semCredenciais && (
        <EmptyState
          icon={BarChart3}
          title="Shopee não configurada"
          description="Defina SHOPEE_APP_ID e SHOPEE_SECRET no .env para ver o relatório de conversão."
        />
      )}

      {erro && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {erro}
        </div>
      )}

      {relatorio && (
        <>
          <div className="flex flex-wrap gap-6 rounded-lg border border-border p-4 text-sm">
            <div>
              <div className="text-muted-foreground">Pedidos no período</div>
              <div className="text-xl font-semibold">{relatorio.totalPedidos}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Comissão total</div>
              <div className="text-xl font-semibold">{reais(relatorio.totalComissao)}</div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por produto</h2>
            {relatorio.porProduto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido no período selecionado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.porProduto.map((linha) => (
                    <TableRow key={linha.itemId}>
                      <TableCell className="font-medium">{linha.itemName}</TableCell>
                      <TableCell>{linha.shopName}</TableCell>
                      <TableCell>{linha.pedidos}</TableCell>
                      <TableCell>{linha.unidades}</TableCell>
                      <TableCell>{reais(linha.comissaoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por rede</h2>
            <p className="text-xs text-muted-foreground">
              Rede identificada a partir do sub-id do link (utmContent). Link antigo ou criado fora do fluxo
              automático de postagem pode cair em &quot;outro&quot;.
            </p>
            {relatorio.porCanal.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido no período selecionado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rede</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.porCanal.map((linha) => (
                    <TableRow key={linha.rede}>
                      <TableCell className="font-medium capitalize">{linha.rede}</TableCell>
                      <TableCell>{linha.pedidos}</TableCell>
                      <TableCell>{linha.unidades}</TableCell>
                      <TableCell>{reais(linha.comissaoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por canal específico</h2>
            <p className="text-xs text-muted-foreground">
              Página/grupo dentro da rede (ex. qual canal do WhatsApp) — só aparece pra links gerados pelo
              fluxo automático de postagem (sub-id [tipo, rede, canal]); link antigo/manual mostra
              &quot;—&quot;.
            </p>
            {relatorio.porCanalEspecifico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido no período selecionado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rede</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.porCanalEspecifico.map((linha) => (
                    <TableRow key={`${linha.rede}::${linha.canalEspecifico ?? ""}`}>
                      <TableCell className="font-medium capitalize">{linha.rede}</TableCell>
                      <TableCell>{linha.canalEspecifico ?? "—"}</TableCell>
                      <TableCell>{linha.pedidos}</TableCell>
                      <TableCell>{linha.unidades}</TableCell>
                      <TableCell>{reais(linha.comissaoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
