import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTikTokTokens } from "@/lib/tiktok/credentials";
import { getMercadoLivreTokens } from "@/lib/mercado-livre/credentials";
import { getMetaTokens } from "@/lib/meta/credentials";
import type { DiscoveryRunSummary } from "@/lib/discovery";
import {
  runDiscoveryNowAction,
  updateDiscoveryScheduleAction,
  updateDiscoveryRulesAction,
  updatePublishScheduleAction,
} from "./actions";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block size-2 rounded-full ${ok ? "bg-green-500" : "bg-muted-foreground/40"}`} />;
}

export default async function AutomationCenterPage() {
  const [
    mlTokens,
    tiktokTokens,
    metaTokens,
    lastJob,
    scheduleSetting,
    rulesSetting,
    pendingCount,
    publishScheduleSetting,
    queuedPublishCount,
    nextQueuedPublish,
  ] = await Promise.all([
    getMercadoLivreTokens(),
    getTikTokTokens(),
    getMetaTokens(),
    prisma.job.findFirst({ where: { queue: "product-discovery" }, orderBy: { createdAt: "desc" } }),
    prisma.setting.findUnique({ where: { key: "discoverySchedule" } }),
    prisma.setting.findUnique({ where: { key: "discoveryRules" } }),
    prisma.productSource.count({ where: { affiliateUrl: null } }),
    prisma.setting.findUnique({ where: { key: "publishSchedule" } }),
    prisma.job.count({ where: { queue: "affiliate-publish", status: "PENDING" } }),
    prisma.job.findFirst({
      where: { queue: "affiliate-publish", status: "PENDING" },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    }),
  ]);

  const schedule = (scheduleSetting?.value as { time?: string } | undefined) ?? { time: "06:00" };
  const rules = (rulesSetting?.value as { minPrice?: number; maxPrice?: number } | undefined) ?? {};
  const publishSchedule = (publishScheduleSetting?.value as
    | { intervalMinutes?: number; windowStartHour?: number; windowEndHour?: number }
    | undefined) ?? {};
  const summary = lastJob?.result as unknown as DiscoveryRunSummary | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Automação"
        description="Descoberta diária de produtos (Mercado Livre + TikTok Shop), status das integrações e execução manual."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm">
            <StatusDot ok={Boolean(mlTokens)} />
            Mercado Livre {mlTokens ? "conectado" : "não conectado"}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm">
            <StatusDot ok={Boolean(tiktokTokens)} />
            TikTok Shop {tiktokTokens ? "conectado" : "não conectado"}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm">
            <StatusDot ok={Boolean(metaTokens?.pages.length)} />
            Facebook {metaTokens?.pages.length ? "pronto" : "pendente"}
          </CardContent>
        </Card>
      </div>

      {(!mlTokens || !tiktokTokens || !metaTokens?.pages.length) && (
        <p className="text-sm text-muted-foreground">
          Contas pendentes: TikTok/ML em{" "}
          <Link href="/admin/integrations" className="underline">
            Integrações
          </Link>
          ; Facebook com META_USER_TOKEN no .env (sem conectar no browser).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Última execução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!lastJob ? (
            <p className="text-muted-foreground">Nenhuma descoberta rodou ainda.</p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {lastJob.finishedAt?.toLocaleString("pt-BR") ?? lastJob.startedAt?.toLocaleString("pt-BR")} ·{" "}
                <Badge variant={lastJob.status === "COMPLETED" ? "default" : "destructive"}>{lastJob.status}</Badge>
              </p>
              {summary && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <span>Produtos encontrados: {summary.found}</span>
                  <span>Novos: {summary.createdNew}</span>
                  <span>Promoções: {summary.promotions}</span>
                  <span>Oportunidades: {summary.opportunitiesCreated}</span>
                  <span>Ignorados: {summary.ignored}</span>
                  <span>Erros: {summary.errors}</span>
                </div>
              )}
            </>
          )}
          <p className="text-muted-foreground">Produtos aguardando link de afiliado: {pendingCount}</p>
          <form action={runDiscoveryNowAction}>
            <Button type="submit" size="sm">
              Rodar descoberta agora
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateDiscoveryScheduleAction} className="flex items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="time">Horário da descoberta diária</Label>
              <Input id="time" name="time" type="time" defaultValue={schedule.time ?? "06:00"} className="w-32" />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Salvar
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Requer o processo de workers rodando (<code>npm run workers</code>) — o scheduler confere o horário a cada 60s.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras de preço</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateDiscoveryRulesAction} className="flex items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="minPrice">Preço mínimo</Label>
              <Input id="minPrice" name="minPrice" type="number" min="0" defaultValue={rules.minPrice ?? 20} className="w-28" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPrice">Preço máximo</Label>
              <Input id="maxPrice" name="maxPrice" type="number" min="0" defaultValue={rules.maxPrice ?? 2000} className="w-28" />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicações agendadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Controla o espaçamento das publicações criadas pela{" "}
            <Link href="/admin/products/import" className="underline">
              importação em massa (CSV)
            </Link>{" "}
            — nunca publica tudo de uma vez.
          </p>
          <p className="text-sm">
            Na fila agora: <strong>{queuedPublishCount}</strong>
            {nextQueuedPublish?.scheduledAt && (
              <> · próxima em {nextQueuedPublish.scheduledAt.toLocaleString("pt-BR")}</>
            )}
          </p>
          <form action={updatePublishScheduleAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="intervalMinutes">Intervalo (min)</Label>
              <Input
                id="intervalMinutes"
                name="intervalMinutes"
                type="number"
                min="5"
                defaultValue={publishSchedule.intervalMinutes ?? 90}
                className="w-28"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windowStartHour">A partir da hora</Label>
              <Input
                id="windowStartHour"
                name="windowStartHour"
                type="number"
                min="0"
                max="23"
                defaultValue={publishSchedule.windowStartHour ?? 9}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windowEndHour">Até a hora</Label>
              <Input
                id="windowEndHour"
                name="windowEndHour"
                type="number"
                min="0"
                max="23"
                defaultValue={publishSchedule.windowEndHour ?? 21}
                className="w-24"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Salvar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Requer o processo de workers rodando (<code>npm run workers</code>) — a fila é processada a cada 60s.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
