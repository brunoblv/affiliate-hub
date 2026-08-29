"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { excluirNotaJornadaAction } from "@/app/admin/(dashboard)/jornada/actions";

export function ExcluirNotaJornadaButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm("Excluir esse bloco? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const resultado = await excluirNotaJornadaAction(id);
      if (!resultado.ok) {
        toast.error(resultado.message ?? "Não foi possível excluir.");
        return;
      }
      toast.success("Bloco excluído.");
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={excluir}>
      <Trash2 />
    </Button>
  );
}
