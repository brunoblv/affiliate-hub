"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCanalAction } from "@/app/admin/(dashboard)/canais/actions";

export function ExcluirCanalButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm(`Excluir o canal "${nome}"? A fila de publicação associada também será apagada. Essa ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(async () => {
      const toastId = toast.loading("Excluindo canal...");
      try {
        await deleteCanalAction(id);
        toast.success("Canal excluído.", { id: toastId });
        router.push("/admin/canais");
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={isPending} onClick={excluir}>
      <Trash2 />
      {isPending ? "Excluindo..." : "Excluir canal"}
    </Button>
  );
}
