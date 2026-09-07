import Link from "next/link";
import { ScrollText } from "lucide-react";
import { prisma, type NivelLog } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatarLocal } from "@/lib/agenda/fuso";
import { diagnosticarPipeline, type StatusEtapa } from "@/lib/admin/diagnostico-pipeline";
import { cn } from "@/lib/utils";

export const maxDuration = 60;

const PAGE_SIZE = 30;

const AREAS = [
  "WORKER",
  "PUBLICACAO",
  "AGENDA",
  "CONTEUDO",
  "PRODUTO_SYNC",
  "PRODUTO_DESCOBERTA",
  "INSIGHTS",
  "VITRINE",
  "ARTES",
] as const;

const NIVEIS: NivelLog[] = ["ERRO", "ALERTA", "INFO"];

const BADGE_ETAPA: Record<StatusEtapa, "default" | "secondary" | "destructive"> = {
  ok: "default",
  alerta: "secondary",
  erro: "destructive",
};

const ROTULO_ETAPA: Record<StatusEtapa, string> = {
  ok: "Ok",
  alerta: "Atenção",
  erro: "Falhou",
};

const BADGE_NIVEL: Record<NivelLog, "default" | "secondary" | "destructive" | "outline"> = {
  INFO: "secondary",
  ALERTA: "outline",
  ERRO: "destructive",
};

function hrefLogs(opts: { area?: string | null; nivel?: string | null; page?: number }) {
  const params = new URLSearchParams();
  if (opts.area) params.set("area", opts.area);
  if (opts.nivel) params.set("nivel", opts.nivel);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/logs?${qs}` : "/admin/logs";
}

function textoContexto(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "string") return valor;
  try {
    return JSON.stringify(valor);
  } catch {
    return "";
  }
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; nivel?: string; page?: string }>;
}) {
  const { area: areaParam, nivel: nivelParam, page: pageParam } = await searchParams;
  const area = AREAS.includes(areaParam as (typeof AREAS)[number]) ? areaParam : undefined;
  const nivel = NIVEIS.includes(nivelParam as NivelLog) ? (nivelParam as NivelLog) : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(area ? { area } : {}),
    ...(nivel ? { nivel } : {}),
  };

  const [diagnostico, logs, total] = await Promise.all([
    diagnosticarPipeline(),
    prisma.log.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, nivel: true, area: true, mensagem: true, contexto: true, criadoEm: true },
    }),
    prisma.log.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const gargalo = diagnostico.gargalo;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Logs"
          description="Percorre worker, sessão, fila e envio para achar onde parou — e lista o que o sistema gravou."
        />
        <Link href="/admin/logs" className="text-sm text-muted-foreground hover:text-foreground">
          Atualizar
        </Link>
      </div>

      {gargalo && gargalo.status !== "ok" ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            gargalo.status === "erro" ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40",
          )}
        >
          <p className="font-medium">
            {gargalo.status === "erro" ? "Onde parou" : "Primeiro ponto de atenção"}: {gargalo.titulo}
          </p>
          <p className="mt-1 text-muted-foreground">{gargalo.resumo}</p>
          {gargalo.detalhe ? <p className="mt-1 text-xs text-muted-foreground">{gargalo.detalhe}</p> : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Etapas</h2>
        <ol className="divide-y divide-border rounded-lg border border-border">
          {diagnostico.etapas.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <Badge variant={BADGE_ETAPA[item.status]} className="mt-0.5">
                {ROTULO_ETAPA[item.status]}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.titulo}</p>
                <p className="text-sm text-muted-foreground">{item.resumo}</p>
                {item.detalhe ? <p className="mt-1 text-xs text-muted-foreground">{item.detalhe}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Registros ({total})</h2>
        </div>

        <nav aria-label="Filtrar por área" className="flex flex-wrap gap-1.5">
          <Link
            href={hrefLogs({ nivel })}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              !area ? "border-foreground/20 bg-background" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Todas
          </Link>
          {AREAS.map((item) => (
            <Link
              key={item}
              href={hrefLogs({ area: item, nivel })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs",
                area === item
                  ? "border-foreground/20 bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </Link>
          ))}
        </nav>

        <nav aria-label="Filtrar por nível" className="flex flex-wrap gap-1.5">
          <Link
            href={hrefLogs({ area })}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              !nivel ? "border-foreground/20 bg-background" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Todos os níveis
          </Link>
          {NIVEIS.map((item) => (
            <Link
              key={item}
              href={hrefLogs({ area, nivel: item })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs",
                nivel === item
                  ? "border-foreground/20 bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </Link>
          ))}
        </nav>

        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nenhum registro neste filtro" description="Troque a área ou o nível, ou aguarde o worker gravar um pulso." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const contexto = textoContexto(log.contexto);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatarLocal(log.criadoEm)}</TableCell>
                    <TableCell>
                      <Badge variant={BADGE_NIVEL[log.nivel]}>{log.nivel}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.area}</TableCell>
                    <TableCell>
                      <p>{log.mensagem}</p>
                      {contexto ? (
                        <p className="mt-1 max-w-xl truncate font-mono text-xs text-muted-foreground" title={contexto}>
                          {contexto}
                        </p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/logs"
          searchParams={{ area, nivel }}
        />
      </section>
    </div>
  );
}
