"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agendarListaOfertaAction, excluirListaOfertaAction } from "@/app/admin/(dashboard)/listas-oferta/actions";
import { LABEL_CATEGORIA, LABEL_PLATAFORMA } from "@/lib/produtos";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { LABEL_DESTINO_LISTA, parseRedesListaOferta } from "@/lib/listas-oferta/destinos";
import type { Categoria, Destino, Plataforma } from "@/lib/database/enums";

export interface ListaOfertaLinha {
  id: string;
  titulo: string;
  categoria: Categoria;
  plataforma: Plataforma;
  destino: Destino;
  redes: unknown;
  ativo: boolean;
  divulgarDiario: boolean;
  textoPinterest: string | null;
  linkAfiliado: string;
}

export function ListasOfertaTabela({ listas }: { listas: ListaOfertaLinha[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function agendar(id: string, titulo: string) {
    startTransition(async () => {
      const toastId = toast.loading(`Agendando “${titulo}”...`);
      try {
        const resultados = await agendarListaOfertaAction(id);
        const agendados = resultados.filter((r) => r.agendadaPara).length;
        if (agendados > 0) {
          toast.success(
            agendados === 1 ? "1 publicação entrou na fila." : `${agendados} publicações entraram na fila.`,
            { id: toastId, action: { label: "Ver fila", onClick: () => router.push("/admin/fila") } },
          );
        } else {
          toast.warning(resultados[0]?.motivoPulado ?? "Nenhum canal recebeu a lista hoje.", {
            id: toastId,
            duration: 8000,
          });
        }
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao agendar.", { id: toastId });
      }
    });
  }

  function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir “${titulo}”? As publicações pendentes dessa lista também saem da fila.`)) return;
    startTransition(async () => {
      const toastId = toast.loading("Excluindo...");
      try {
        const resultado = await excluirListaOfertaAction(id);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success("Lista excluída.", { id: toastId });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  function copiarPin(texto: string) {
    void navigator.clipboard.writeText(texto).then(
      () => toast.success("Legenda do Pinterest copiada."),
      () => toast.error("Não deu para copiar."),
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lista</TableHead>
          <TableHead>Loja</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listas.map((lista) => {
          const redes = parseRedesListaOferta(lista.redes);
          return (
            <TableRow key={lista.id}>
              <TableCell>
                <div className="font-medium">{lista.titulo}</div>
                <div className="text-xs text-muted-foreground">{LABEL_CATEGORIA[lista.categoria]}</div>
              </TableCell>
              <TableCell>{LABEL_PLATAFORMA[lista.plataforma]}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {redes.map((rede) => (
                    <Badge key={rede} variant="outline">
                      {LABEL_DESTINO_LISTA[rede]}
                    </Badge>
                  ))}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{LABEL_DESTINO[lista.destino]}</div>
              </TableCell>
              <TableCell>
                <Badge variant={lista.ativo ? "default" : "secondary"}>{lista.ativo ? "Ativa" : "Inativa"}</Badge>
                {lista.divulgarDiario && (
                  <div className="mt-1 text-xs text-muted-foreground">Todo dia</div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => agendar(lista.id, lista.titulo)}>
                    Agendar hoje
                  </Button>
                  <Button type="button" size="sm" variant="outline" render={<Link href={`/admin/listas-oferta?editar=${lista.id}`} />}>
                    Editar
                  </Button>
                  {lista.textoPinterest && (
                    <Button type="button" size="sm" variant="outline" onClick={() => copiarPin(lista.textoPinterest!)}>
                      Copiar Pinterest
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => excluir(lista.id, lista.titulo)}>
                    Excluir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
