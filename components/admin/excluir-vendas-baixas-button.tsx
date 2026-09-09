"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  contarProdutosVendasAbaixoDeAction,
  excluirProdutosVendasAbaixoDeAction,
} from "@/app/admin/(dashboard)/produtos/actions";

/** Exclui produto Shopee com vendas conhecidas abaixo de um limite digitado. */
export function ExcluirVendasBaixasButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function iniciar() {
    const digitado = window.prompt("Excluir produtos Shopee com vendas menores que:", "10");
    if (digitado === null) return;

    const limite = Number(digitado.trim());
    if (!Number.isInteger(limite) || limite < 1) {
      toast.error("Digite um número inteiro maior que zero.");
      return;
    }

    startTransition(async () => {
      const contagem = await contarProdutosVendasAbaixoDeAction(limite);
      if (!contagem.ok) {
        toast.error(contagem.message);
        return;
      }
      if (contagem.total === 0) {
        toast.info(`Nenhum produto Shopee com vendas menores que ${limite}.`);
        return;
      }

      const ok = window.confirm(
        `Isso vai apagar ${contagem.total} produto(s) Shopee com vendas menores que ${limite}, junto com a página de ficha de cada um. Não dá pra desfazer. Continuar?`,
      );
      if (!ok) return;

      const toastId = toast.loading(`Excluindo ${contagem.total} produto(s)...`);
      const resultado = await excluirProdutosVendasAbaixoDeAction(limite);
      if (!resultado.ok) {
        toast.error(resultado.message, { id: toastId });
        return;
      }
      toast.success(`${resultado.total} produto(s) excluído(s).`, { id: toastId });
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={iniciar}>
      <Trash2 />
      {isPending ? "Processando..." : "Excluir por vendas mínimas"}
    </Button>
  );
}
