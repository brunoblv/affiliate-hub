"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analisarCliquesAction } from "@/app/admin/(dashboard)/produtos/relatorio-cliques/actions";
import type { RelatorioCliquesAgregado } from "@/lib/shopee/relatorio-cliques";

export function RelatorioCliquesForm() {
  const [texto, setTexto] = useState("");
  const [relatorio, setRelatorio] = useState<RelatorioCliquesAgregado | null>(null);
  const [pending, startTransition] = useTransition();

  function analisar() {
    startTransition(async () => {
      const resultado = await analisarCliquesAction(texto);
      if (!resultado.ok) {
        toast.error(resultado.message);
        setRelatorio(null);
        return;
      }
      setRelatorio(resultado.relatorio);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Exporte a planilha de <strong>Cliques</strong> no painel de afiliados da Shopee e cole aqui (com
          cabeçalho ou sem, tanto faz). Colunas esperadas: ID dos Cliques, Período, Região, Sub_id,
          Referenciador.
        </p>
        <Textarea
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={"3cfe4b1f...\t07/09/2026 19:50:17\tBrazil\tproduto-whatsapp-achadinhos-a1b2c3d4e5\tPinterest"}
          className="min-h-48 font-mono text-xs"
        />
        <Button type="button" onClick={analisar} disabled={pending}>
          {pending ? "Analisando..." : "Analisar"}
        </Button>
      </div>

      {relatorio && (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-6 rounded-lg border border-border p-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cliques na planilha</div>
              <div className="text-xl font-semibold">{relatorio.totalCliques}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sem produto identificado</div>
              <div className="text-xl font-semibold">{relatorio.totalLinhasSemProduto}</div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por rede</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rede</TableHead>
                  <TableHead>Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorio.porRede.map((linha) => (
                  <TableRow key={linha.rede}>
                    <TableCell className="font-medium capitalize">{linha.rede}</TableCell>
                    <TableCell>{linha.cliques}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por canal específico</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rede</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorio.porCanal.map((linha) => (
                  <TableRow key={`${linha.rede}::${linha.canalEspecifico ?? ""}`}>
                    <TableCell className="font-medium capitalize">{linha.rede}</TableCell>
                    <TableCell>{linha.canalEspecifico ?? "—"}</TableCell>
                    <TableCell>{linha.cliques}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Por produto</h2>
            <p className="text-xs text-muted-foreground">
              Só aparece pra links gerados pelo fluxo automático de postagem (com o 4º sub-id do produto) —
              link antigo/manual não tem como cruzar.
            </p>
            {relatorio.porProduto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum clique com produto identificável.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.porProduto.map((linha) => (
                    <TableRow key={linha.produtoId}>
                      <TableCell className="font-medium">{linha.nome ?? `(não encontrado: ${linha.produtoId})`}</TableCell>
                      <TableCell>{linha.cliques}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
