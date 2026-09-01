"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProdutosAction, distribuirProdutosAction, type ResultadoDistribuicaoEmLote } from "@/app/admin/(dashboard)/produtos/actions";
import { BarraExclusaoEmLote, CheckboxLote, useSelecaoEmLote } from "@/components/admin/selecao-em-lote";

export interface ProdutoLinha {
  id: string;
  nome: string;
  plataforma: string;
  destino: string;
  categoria: string;
  precoAtual: number;
  desconto: number | null;
  ativo: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function avisarDistribuicao(
  lote: ResultadoDistribuicaoEmLote[],
  toastId: string | number,
  router: ReturnType<typeof useRouter>,
) {
  const agendados = lote.reduce((soma, item) => soma + item.resultados.filter((r) => r.agendadaPara).length, 0);
  const pulado = lote.flatMap((item) => item.resultados).find((r) => !r.agendadaPara)?.motivoPulado;

  if (agendados > 0) {
    toast.success(agendados === 1 ? "1 publicação entrou na fila." : `${agendados} publicações entraram na fila.`, {
      id: toastId,
      action: { label: "Ver fila", onClick: () => router.push("/admin/fila") },
    });
    return;
  }

  toast.warning(pulado ?? "Nenhum canal recebeu o produto.", { id: toastId, duration: 8000 });
}

export function ProdutosTabela({ produtos }: { produtos: ProdutoLinha[] }) {
  const router = useRouter();
  const [excluindo, startExcluir] = useTransition();
  const [enfileirando, startEnfileirar] = useTransition();
  const isPending = excluindo || enfileirando;
  const selecao = useSelecaoEmLote(produtos.map((produto) => produto.id));

  function excluirSelecionados() {
    const ids = [...selecao.selecionados];
    const n = ids.length;
    if (n === 0) return;
    if (
      !confirm(
        `Excluir ${n} produto${n === 1 ? "" : "s"}? A página associada no blog também será apagada. Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    startExcluir(async () => {
      const toastId = toast.loading(n === 1 ? "Excluindo produto..." : `Excluindo ${n} produtos...`);
      try {
        const resultado = await deleteProdutosAction(ids);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success(
          resultado.count === 1
            ? "Produto e página associada excluídos."
            : `${resultado.count} produtos e páginas associadas excluídos.`,
          { id: toastId },
        );
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  function enfileirar(ids: string[]) {
    const n = ids.length;
    if (n === 0) return;

    startEnfileirar(async () => {
      const toastId = toast.loading(n === 1 ? "Enviando para a fila..." : `Enviando ${n} produtos para a fila...`);
      try {
        const resultado = await distribuirProdutosAction(ids);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível enfileirar.", { id: toastId });
          return;
        }
        avisarDistribuicao(resultado.lote, toastId, router);
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível enfileirar.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-3">
      <BarraExclusaoEmLote
        quantidade={selecao.quantidade}
        rotuloSingular="produto"
        rotuloPlural="produtos"
        isPending={isPending}
        excluindo={excluindo}
        onExcluir={excluirSelecionados}
        extra={
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => enfileirar([...selecao.selecionados])}
          >
            <SendHorizontal />
            {enfileirando ? "Enviando..." : "Enviar para a fila"}
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <CheckboxLote
                checked={selecao.todosSelecionados}
                indeterminate={selecao.algunsSelecionados}
                onChange={selecao.toggleTodos}
                aria-label="Selecionar todos os produtos desta página"
              />
            </TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Plataforma</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => {
            const marcado = selecao.selecionados.has(produto.id);
            return (
              <TableRow key={produto.id} data-state={marcado ? "selected" : undefined}>
                <TableCell>
                  <CheckboxLote
                    checked={marcado}
                    onChange={() => selecao.toggle(produto.id)}
                    aria-label={`Selecionar ${produto.nome}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/produtos/${produto.id}`} className="hover:underline">
                    {produto.nome}
                  </Link>
                </TableCell>
                <TableCell>{produto.plataforma}</TableCell>
                <TableCell>{produto.destino}</TableCell>
                <TableCell>{produto.categoria}</TableCell>
                <TableCell>
                  {formatCurrency(produto.precoAtual)}
                  {produto.desconto !== null && (
                    <span className="ml-2 text-xs text-muted-foreground">-{produto.desconto}%</span>
                  )}
                </TableCell>
                <TableCell>{produto.ativo ? "Ativo" : "Inativo"}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || !produto.ativo}
                    onClick={() => enfileirar([produto.id])}
                    aria-label={`Enviar ${produto.nome} para a fila`}
                  >
                    <SendHorizontal />
                    Fila
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
