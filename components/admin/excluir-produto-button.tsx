"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProdutosAction } from "@/app/admin/(dashboard)/produtos/actions";

export function ExcluirProdutoButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm(`Excluir "${nome}"? A página associada no blog também será apagada. Essa ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(async () => {
      const toastId = toast.loading("Excluindo produto...");
      try {
        const resultado = await deleteProdutosAction([id]);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success("Produto e página associada excluídos.", { id: toastId });
        router.push("/admin/produtos");
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={isPending} onClick={excluir}>
      <Trash2 />
      {isPending ? "Excluindo..." : "Excluir produto"}
    </Button>
  );
}
