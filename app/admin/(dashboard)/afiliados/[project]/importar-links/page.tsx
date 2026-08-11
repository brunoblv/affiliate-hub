import Link from "next/link";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { getScrapeDelayMinutes } from "@/lib/scrape";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { enqueueProjectUrlScrapesAction } from "./actions";

const textareaClassName =
  "min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function ImportarLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ queued?: string; delay?: string }>;
}) {
  const { project: slug } = await params;
  const query = await searchParams;
  const project = await getProjectBySlug(slug);

  const [categories, delayMinutes, recentJobsRaw] = await Promise.all([
    prisma.category.findMany({
      where: { projectId: project.id, active: true },
      orderBy: { name: "asc" },
    }),
    getScrapeDelayMinutes(),
    prisma.job.findMany({
      where: { queue: "url-scrape" },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const recentJobs = recentJobsRaw
    .filter((job) => {
      const payload = job.payload as { projectId?: string } | null;
      return payload?.projectId === project.id;
    })
    .slice(0, 30);
  const enqueue = enqueueProjectUrlScrapesAction.bind(null, slug);

  return (
    <div className="space-y-6">
      {query.queued && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          {query.queued} link(s) enfileirado(s) com intervalo de {query.delay ?? "?"} minuto(s). Acompanhe a fila
          abaixo e revise em <Link href={`/admin/afiliados/${slug}/revisar`} className="underline">Revisar</Link>.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cole links de produto (um por linha). O worker Playwright abre cada URL com intervalo entre elas e
          grava no banco. Produtos novos entram como <strong>inativos</strong> até você revisar.
        </p>
        <Link href={`/admin/afiliados/${slug}/revisar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Ir para revisão
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enfileirar links</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={enqueue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urls">Links (um por linha)</Label>
              <textarea
                id="urls"
                name="urls"
                required
                placeholder={"https://...\nhttps://..."}
                className={textareaClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria (opcional)</Label>
                <select id="categoryId" name="categoryId" className={selectClassName} defaultValue="">
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delayMinutes">Intervalo entre links (minutos)</Label>
                <Input
                  id="delayMinutes"
                  name="delayMinutes"
                  type="number"
                  min={1}
                  max={60}
                  defaultValue={delayMinutes}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Precisa de Redis (`REDIS_URL`) e do processo <code className="font-mono">npm run workers</code> rodando.
              O 1º link começa na hora; os seguintes respeitam o intervalo.
            </p>

            <Button type="submit" size="sm">
              Enfileirar scrapes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila recente ({recentJobs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum scrape enfileirado ainda neste projeto.</p>
          ) : (
            recentJobs.map((job) => {
              const payload = job.payload as { url?: string } | null;
              return (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{job.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{payload?.url ?? "—"}</p>
                    {job.error && <p className="text-xs text-destructive">{job.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "COMPLETED" ? "default" : job.status === "FAILED" ? "destructive" : "outline"}>
                      {job.status}
                    </Badge>
                    {job.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        {job.scheduledAt.toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
