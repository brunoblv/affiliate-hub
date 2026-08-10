import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importProductsAction, type ImportSummary } from "./actions";

export default async function ImportProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const job = jobId ? await prisma.job.findUnique({ where: { id: jobId } }) : null;
  const summary = job?.result as unknown as ImportSummary | undefined;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Importar produtos (CSV)"
        description="Cadastro em massa de produtos coletados manualmente — Mercado Livre (a API de busca foi descontinuada para terceiros), Amazon, Shopee ou qualquer outra plataforma."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Baixe o modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Colunas: <code>nome</code>, <code>projeto</code> (slug: meu-novo-lar / umbanda / chartfm),{" "}
            <code>plataforma</code> (ex: MERCADO_LIVRE, SHOPEE, AMAZON, OUTRAS), <code>id_anuncio</code> (opcional —
            preencha para poder reenviar a planilha depois e atualizar em vez de duplicar), <code>categoria</code>,{" "}
            <code>marca</code>, <code>descricao</code>, <code>preco</code>, <code>preco_original</code>,{" "}
            <code>comissao_percent</code>, <code>avaliacao</code>, <code>num_avaliacoes</code>, <code>vendidos</code>,{" "}
            <code>url_imagem</code>, <code>url_produto</code>, <code>url_afiliado</code>.
          </p>
          <p>
            Apenas <code>nome</code>, <code>projeto</code> e <code>preco</code> são obrigatórios. Se preencher{" "}
            <code>url_afiliado</code>, a publicação (Página + grupos + blog) é{" "}
            <strong>agendada e espalhada ao longo do dia</strong> — nunca todos de uma vez. O intervalo padrão é a
            cada 90min, das 9h às 21h; a fila é processada pelo processo de workers (
            <code>npm run workers</code>), que precisa estar rodando.
          </p>
          <a
            href="/api/admin/products/import-template"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Baixar modelo .csv
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Envie o arquivo preenchido</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importProductsAction} encType="multipart/form-data" className="flex items-center gap-3">
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button type="submit">Importar</Button>
          </form>
        </CardContent>
      </Card>

      {job && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado da última importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={job.status === "COMPLETED" ? "default" : "destructive"}>{job.status}</Badge>
            {job.error && <p className="text-destructive">{job.error}</p>}
            {summary && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <span>Linhas: {summary.totalRows}</span>
                  <span>Criados: {summary.created}</span>
                  <span>Atualizados: {summary.updated}</span>
                  <span>Ignorados: {summary.ignored}</span>
                  <span>Links agendados: {summary.linksScheduled}</span>
                </div>
                {summary.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium">Avisos / erros por linha:</p>
                    <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-xs text-muted-foreground">
                      {summary.errors.map((e, idx) => (
                        <li key={idx}>
                          Linha {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Link href="/admin/products" className="text-sm text-muted-foreground underline">
        Voltar para Produtos
      </Link>
    </div>
  );
}
