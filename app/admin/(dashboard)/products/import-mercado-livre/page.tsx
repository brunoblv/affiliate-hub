import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { importMercadoLivreProductsAction, type MlImportSummary } from "./actions";

export default async function ImportMercadoLivreProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const [job, projects, categories] = await Promise.all([
    jobId ? prisma.job.findUnique({ where: { id: jobId } }) : null,
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, include: { project: true } }),
  ]);
  const summary = job?.result as unknown as MlImportSummary | undefined;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Importar do Mercado Livre"
        description="Cole o código ou a URL do produto — nome, imagem, marca e preço são buscados automaticamente na API do Mercado Livre."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importMercadoLivreProductsAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projeto *</Label>
                <select
                  id="projectId"
                  name="projectId"
                  required
                  defaultValue={projects[0]?.id}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">—</option>
                  {projects.map((project) => (
                    <optgroup key={project.id} label={project.name}>
                      {categories
                        .filter((c) => c.projectId === project.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entries">Um produto por linha *</Label>
              <textarea
                id="entries"
                name="entries"
                rows={10}
                required
                placeholder={[
                  "https://www.mercadolivre.com.br/.../p/MLB66132984",
                  "https://www.mercadolivre.com.br/.../p/MLB48896933;https://mercadolivre.com/sec/seu-link-afiliado",
                  "MLB63036814\thttps://www.mercadolivre.com.br/.../p/MLB63036814\thttps://meli.la/seu-link-afiliado",
                ].join("\n")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo da página do produto (precisa conter <code>/p/MLB...</code>) ou apenas o código do
                catálogo (ex: <code>MLB66132984</code>). Opcionalmente, depois de <code>;</code> ou um Tab, cole o seu
                link de afiliado gerado no Portal de Afiliados — isso agenda a publicação automática (Página + blog)
                assim que salvar. Também aceita colar direto uma tabela de 3 colunas (código, link, link afiliado) —
                cada coluna é identificada pelo conteúdo, não pela posição. Quando um catálogo tem mais de um
                vendedor, o anúncio mais barato é escolhido.
                <br />
                <strong>Atenção:</strong> só funciona pra anúncios de catálogo (URL com <code>/p/MLB...</code>).
                Anúncios sem catálogo (URL com <code>/up/MLBU...</code>) não são suportados por essa tela ainda.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit">Importar</Button>
            </div>
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
