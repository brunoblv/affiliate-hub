"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProdutosAction } from "@/app/admin/(dashboard)/produtos/actions";
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

export function ProdutosTabela({ produtos }: { produtos: ProdutoLinha[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
      const toastId = toast.loading(n === 1 ? "Excluindo produto..." : `Excluindo ${n} produtos...`);
      try {
        const resultado = await deleteProdutosAction(ids);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success(
          resultado.count === 1 ? "Produto e página associada excluídos." : `${resultado.count} produtos e páginas associadas excluídos.`,
          { id: toastId },
        );
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
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
        onExcluir={excluirSelecionados}
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
