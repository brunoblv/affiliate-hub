"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { agendarListasOfertaDoDiaAction } from "@/app/admin/(dashboard)/listas-oferta/actions";

export function AgendarListasOfertaDoDiaButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function agendar() {
    startTransition(async () => {
      const toastId = toast.loading("Enfileirando as listas ativas de hoje...");
      try {
        const { agendados } = await agendarListasOfertaDoDiaAction();
        toast.success(
          agendados === 0
            ? "Nada novo: as listas ativas já estão na fila de hoje ou não têm canal."
            : agendados === 1
              ? "1 lista entrou na fila de hoje."
              : `${agendados} listas entraram na fila de hoje.`,
          { id: toastId },
        );
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao enfileirar.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={agendar}>
      {isPending ? "Agendando..." : "Agendar listas de hoje"}
    </Button>
  );
}
