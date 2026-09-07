import { Fragment } from "react";
import { Send } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaRowActions } from "@/components/admin/fila-row-actions";
import { FilaFiltros } from "@/components/admin/fila-filtros";
import { chaveDoDia, FUSO_APP, formatarHora, formatarLocal, intervaloDoDia, somarDiasCivis } from "@/lib/agenda/fuso";
import { ehRedeFila, LABEL_REDE_FILA, REDE_PADRAO_FILA, REDES_FILA, type RedeFila } from "@/lib/agenda/fila-admin";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { LimparFilaButton } from "@/components/admin/limpar-fila-button";

export const maxDuration = 60;

const VARIANTE_STATUS: Record<string, "default" | "secondary" | "destructive"> = {
  PENDENTE: "secondary",
  PUBLICANDO: "secondary",
  PUBLICADA: "default",
  FALHOU: "destructive",
  CANCELADA: "secondary",
};

const JANELA_DIAS_ANTES = 1;
const JANELA_DIAS_DEPOIS = 5;

function rotuloDiaChip(chave: string, hoje: string): string {
  if (chave === hoje) return "Hoje";
  if (chave === somarDiasCivis(hoje, 1)) return "Amanhã";
  if (chave === somarDiasCivis(hoje, -1)) return "Ontem";
  const intervalo = intervaloDoDia(chave);
  if (!intervalo) return chave;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO_APP,
  }).format(intervalo.gte);
}

function rotuloDiaLongo(chave: string, hoje: string): string {
  const intervalo = intervaloDoDia(chave);
  if (!intervalo) return chave;
  const data = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FUSO_APP,
  }).format(intervalo.gte);
  if (chave === hoje) return `Hoje — ${data}`;
  if (chave === somarDiasCivis(hoje, 1)) return `Amanhã — ${data}`;
  if (chave === somarDiasCivis(hoje, -1)) return `Ontem — ${data}`;
  return data.charAt(0).toUpperCase() + data.slice(1);
}

function tituloDaPublicacao(publicacao: {
  produto: { nome: string } | null;
  post: { titulo: string } | null;
  landingDiaria: { headline: string | null } | null;
  listaOferta: { titulo: string } | null;
}): string {
  return (
    publicacao.produto?.nome ??
    publicacao.post?.titulo ??
    publicacao.landingDiaria?.headline ??
    publicacao.listaOferta?.titulo ??
    "Landing"
  );
}

export default async function FilaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; dia?: string; canal?: string; rede?: string }>;
}) {
  const { page: pageParam, dia: diaParam, canal: canalParam, rede: redeParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const hoje = chaveDoDia(new Date());
  const verTodos = diaParam === "todos";
  const dia = verTodos ? hoje : intervaloDoDia(diaParam ?? "") ? diaParam! : hoje;
  const intervalo = verTodos ? null : intervaloDoDia(dia);

  const canais = await prisma.canal.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, ativo: true, rede: true },
  });
  const canalEscolhido = canais.find((canal) => canal.id === canalParam);
  const canalId = canalEscolhido?.id ?? null;
  const rede: RedeFila = canalEscolhido
    ? canalEscolhido.rede
    : redeParam === "todas"
      ? "todas"
      : ehRedeFila(redeParam)
        ? redeParam
        : REDE_PADRAO_FILA;
  const whereRedeOuCanal = canalId
    ? { canalId }
    : rede === "todas"
      ? {}
      : { canal: { rede } };
  const where = {
    ...whereRedeOuCanal,
    ...(intervalo ? { agendadaPara: { gte: intervalo.gte, lt: intervalo.lt } } : {}),
  };

  const chavesJanela = Array.from(
    { length: JANELA_DIAS_ANTES + JANELA_DIAS_DEPOIS + 1 },
    (_, indice) => somarDiasCivis(hoje, indice - JANELA_DIAS_ANTES),
  );
  if (!verTodos && !chavesJanela.includes(dia)) {
    chavesJanela.push(dia);
    chavesJanela.sort();
  }

  const whereDoDia = intervalo ? { agendadaPara: { gte: intervalo.gte, lt: intervalo.lt } } : {};

  const [publicacoes, total, totalGeral, totalFiltrado, pendentes, ...contagens] = await Promise.all([
    prisma.publicacao.findMany({
      where,
      orderBy: { agendadaPara: verTodos ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        produto: { select: { nome: true } },
        post: { select: { titulo: true } },
        landingDiaria: { select: { headline: true, slug: true } },
        listaOferta: { select: { titulo: true } },
        canal: { select: { nome: true } },
      },
    }),
    prisma.publicacao.count({ where }),
    prisma.publicacao.count(),
    prisma.publicacao.count({ where: whereRedeOuCanal }),
    prisma.publicacao.count({ where: { ...where, status: "PENDENTE" } }),
    ...REDES_FILA.map((item) =>
      prisma.publicacao.count({
        where: { canal: { rede: item.id }, ...whereDoDia },
      }),
    ),
    ...chavesJanela.map((chave) => {
      const faixa = intervaloDoDia(chave);
      if (!faixa) return Promise.resolve(0);
      return prisma.publicacao.count({
        where: { ...whereRedeOuCanal, agendadaPara: { gte: faixa.gte, lt: faixa.lt } },
      });
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const contagensRedes = contagens.slice(0, REDES_FILA.length);
  const contagensDias = contagens.slice(REDES_FILA.length);

  const redes = REDES_FILA.map((item, indice) => ({
    ...item,
    count: contagensRedes[indice] ?? 0,
  }));
  const dias = chavesJanela.map((chave, indice) => ({
    chave,
    rotulo: rotuloDiaChip(chave, hoje),
    count: contagensDias[indice] ?? 0,
  }));

  const canalNome = canalEscolhido?.nome;
  const rotuloRede = rede === "todas" ? null : LABEL_REDE_FILA[rede];
  const recorte = canalNome ?? rotuloRede;
  const descricao = verTodos
    ? `${total} publicação${total === 1 ? "" : "ões"}${recorte ? ` em ${recorte}` : ""} — ${pendentes} pendente${pendentes === 1 ? "" : "s"}.`
    : `${rotuloDiaLongo(dia, hoje)}${recorte ? ` · ${recorte}` : ""} — ${total} no dia, ${pendentes} pendente${pendentes === 1 ? "" : "s"}.`;
  const titulo = rede === "todas" ? "Fila" : `Fila do ${LABEL_REDE_FILA[rede]}`;

  const grupos = verTodos
    ? agruparPorDia(publicacoes, hoje)
    : [{ chave: dia, rotulo: null as string | null, itens: publicacoes }];

  const semPublicacaoAlguma = totalGeral === 0;
  const vazioNoFiltro = publicacoes.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title={titulo} description={descricao} />
        <LimparFilaButton total={totalGeral} />
      </div>

      <FilaFiltros
        dia={dia}
        verTodos={verTodos}
        rede={rede}
        canalId={canalId}
        canais={canais}
        dias={dias}
        redes={redes}
        totalTodos={totalFiltrado}
      />

      {vazioNoFiltro ? (
        <EmptyState
          icon={Send}
          title={semPublicacaoAlguma ? "Nenhuma publicação agendada" : "Nada neste filtro"}
          description={
            semPublicacaoAlguma
              ? "Distribua um produto na tela de Produtos para começar."
              : rede === REDE_PADRAO_FILA
                ? "Não há posts de WhatsApp neste dia. Troque o dia, o grupo, ou abra outra rede."
                : "Não há publicações neste dia ou canal. Troque o filtro ou escolha Todos os dias."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>{rede === REDE_PADRAO_FILA ? "Grupo" : "Canal"}</TableHead>
              <TableHead>{verTodos ? "Agendada para" : "Horário"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((grupo) => (
              <Fragment key={grupo.chave}>
                {grupo.rotulo && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/50 text-sm font-medium">
                      {grupo.rotulo}
                    </TableCell>
                  </TableRow>
                )}
                {grupo.itens.map((publicacao) => (
                  <TableRow key={publicacao.id}>
                    <TableCell className="font-medium">{tituloDaPublicacao(publicacao)}</TableCell>
                    <TableCell>{publicacao.canal.nome}</TableCell>
                    <TableCell>
                      {verTodos ? formatarLocal(publicacao.agendadaPara) : `${formatarHora(publicacao.agendadaPara)} (Brasília)`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANTE_STATUS[publicacao.status] ?? "secondary"}>{publicacao.status}</Badge>
                      {publicacao.erro && <p className="mt-1 max-w-xs truncate text-xs text-destructive">{publicacao.erro}</p>}
                    </TableCell>
                    <TableCell>
                      <FilaRowActions
                        id={publicacao.id}
                        status={publicacao.status}
                        agendadaPara={publicacao.agendadaPara.toISOString()}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/fila"
        searchParams={{
          dia: verTodos ? "todos" : dia,
          rede: rede === REDE_PADRAO_FILA ? undefined : rede,
          canal: canalId ?? undefined,
        }}
      />
    </div>
  );
}

function agruparPorDia<T extends { agendadaPara: Date }>(
  itens: T[],
  hoje: string,
): { chave: string; rotulo: string; itens: T[] }[] {
  const grupos: { chave: string; rotulo: string; itens: T[] }[] = [];
  for (const item of itens) {
    const chave = chaveDoDia(item.agendadaPara);
    const ultimo = grupos.at(-1);
    if (ultimo?.chave === chave) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ chave, rotulo: rotuloDiaLongo(chave, hoje), itens: [item] });
    }
  }
  return grupos;
}
