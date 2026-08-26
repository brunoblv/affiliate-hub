import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatarLocal, inicioDoDia } from "@/lib/agenda/fuso";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export default async function PainelPage() {
  const hoje = new Date();
  const comecoDoDia = inicioDoDia(hoje);
  const fimDoDia = new Date(comecoDoDia.getTime() + MS_POR_DIA);
  const seteDiasAtras = new Date(hoje.getTime() - 7 * MS_POR_DIA);

  const [publicacoesHoje, falhas, cliquesSemana] = await Promise.all([
    prisma.publicacao.findMany({
      where: { agendadaPara: { gte: comecoDoDia, lt: fimDoDia } },
      orderBy: { agendadaPara: "asc" },
      include: {
        produto: { select: { nome: true } },
        post: { select: { titulo: true } },
        canal: { select: { nome: true } },
      },
    }),
    prisma.publicacao.findMany({
      where: { status: "FALHOU" },
      orderBy: { atualizadoEm: "desc" },
      take: 10,
      include: {
        produto: { select: { nome: true } },
        post: { select: { titulo: true } },
        canal: { select: { nome: true } },
      },
    }),
    prisma.clique.groupBy({
      by: ["origem"],
      where: { criadoEm: { gte: seteDiasAtras } },
      _count: { _all: true },
    }),
  ]);

  const totalCliques = cliquesSemana.reduce((soma, item) => soma + item._count._all, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Painel" description="Publicações de hoje, falhas recentes e cliques da semana." />

      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Publicações de hoje</h2>
        {publicacoesHoje.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma publicação agendada para hoje.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {publicacoesHoje.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {p.produto?.nome ?? p.post?.titulo} — {p.canal.nome} — {formatarLocal(p.agendadaPara)}
                </span>
                <Badge variant={p.status === "PUBLICADA" ? "default" : p.status === "FALHOU" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Falhas recentes</h2>
          <Link href="/admin/fila" className="text-xs text-primary hover:underline">
            Ver fila
          </Link>
        </div>
        {falhas.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma falha recente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {falhas.map((p) => (
              <li key={p.id} className="rounded-lg border border-destructive/30 px-3 py-2 text-sm">
                <div className="font-medium">
                  {p.produto?.nome ?? p.post?.titulo} — {p.canal.nome}
                </div>
                {p.erro && <div className="mt-1 text-xs text-destructive">{p.erro}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Cliques dos últimos 7 dias ({totalCliques})</h2>
        {cliquesSemana.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {cliquesSemana.map((item) => (
              <li key={item.origem ?? "desconhecido"} className="flex justify-between border-b border-border/60 py-1.5">
                <span>{item.origem ?? "(sem origem)"}</span>
                <span className="font-medium">{item._count._all}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
