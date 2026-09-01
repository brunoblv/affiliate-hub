"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { limparFilaAction } from "@/app/admin/(dashboard)/fila/actions";

export function LimparFilaButton({ total }: { total: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (total === 0) return null;

  function limpar() {
    if (
      !confirm(
        `Apagar as ${total} publicação${total === 1 ? "" : "ões"} da fila? Inclui pendentes, publicadas, canceladas e com falha. Itens que estiverem saindo agora são mantidos. Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading("Limpando a fila...");
      try {
        const resultado = await limparFilaAction();
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível limpar a fila.", { id: toastId });
          return;
        }
        const mantidas =
          resultado.emPublicacao > 0
            ? ` ${resultado.emPublicacao} em publicação ${resultado.emPublicacao === 1 ? "foi mantida" : "foram mantidas"}.`
            : "";
        toast.success(
          resultado.count === 0
            ? `Nada a apagar.${mantidas}`
            : resultado.count === 1
              ? `1 publicação apagada.${mantidas}`
              : `${resultado.count} publicações apagadas.${mantidas}`,
          { id: toastId },
        );
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível limpar a fila.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={isPending} onClick={limpar}>
      <Trash2 />
      {isPending ? "Limpando..." : "Limpar fila"}
    </Button>
  );
}
