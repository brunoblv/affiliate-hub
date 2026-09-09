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
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioCliquesAgregado | null>(null);
  const [pending, startTransition] = useTransition();

  function analisarTexto(conteudo: string) {
    startTransition(async () => {
      const resultado = await analisarCliquesAction(conteudo);
      if (!resultado.ok) {
        toast.error(resultado.message);
        setRelatorio(null);
        return;
      }
      setRelatorio(resultado.relatorio);
    });
  }

  async function handleUploadArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ""; // permite re-selecionar o mesmo arquivo depois
    if (!arquivo) return;

    setNomeArquivo(arquivo.name);
    const conteudo = await arquivo.text();
    setTexto(conteudo);
    analisarTexto(conteudo);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Exporte o CSV de <strong>Cliques</strong> no painel de afiliados da Shopee (ex.{" "}
          <code className="text-xs">WebsiteClickReportAAAAMMDDHHmm.csv</code>) e envie aqui. Colunas
          esperadas: ID dos Cliques, Tempo dos Cliques, Região dos Cliques, Sub_id, Referenciador.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={pending} render={<label />}>
            {pending ? "Analisando..." : "Enviar CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleUploadArquivo} />
          </Button>
          {nomeArquivo && <span className="text-sm text-muted-foreground">{nomeArquivo}</span>}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Ou colar o conteúdo manualmente</summary>
          <div className="mt-3 space-y-3">
            <Textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={"3cfe4b1f...,2026-09-07 19:50:17,Brazil,produto-whatsapp-achadinhos-a1b2c3d4e5,Pinterest"}
              className="min-h-48 font-mono text-xs"
            />
            <Button type="button" onClick={() => analisarTexto(texto)} disabled={pending}>
              {pending ? "Analisando..." : "Analisar"}
            </Button>
          </div>
        </details>
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
