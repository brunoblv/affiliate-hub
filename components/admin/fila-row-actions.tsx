"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarPublicacaoAction, republicarAction, reagendarAction } from "@/app/admin/(dashboard)/fila/actions";

export function FilaRowActions({
  id,
  status,
  agendadaPara,
}: {
  id: string;
  status: string;
  agendadaPara: string;
}) {
  const [isPending, startTransition] = useTransition();

  function executar(pendente: string, sucesso: string, acao: () => Promise<void>) {
    startTransition(async () => {
      const toastId = toast.loading(pendente);
      try {
        await acao();
        toast.success(sucesso, { id: toastId });
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir.", { id: toastId });
      }
    });
  }

  function reagendar() {
    const valor = prompt("Nova data/hora (AAAA-MM-DDTHH:mm)", agendadaPara.slice(0, 16));
    if (!valor) return;
    executar("Reagendando...", "Publicação reagendada.", () => reagendarAction(id, valor));
  }

  return (
    <div className="flex gap-2">
      {status === "FALHOU" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => executar("Republicando...", "Publicação de volta na fila.", () => republicarAction(id))}
        >
          Republicar
        </Button>
      )}
      {(status === "PENDENTE" || status === "FALHOU") && (
        <>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={reagendar}>
            Reagendar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => executar("Cancelando...", "Publicação cancelada.", () => cancelarPublicacaoAction(id))}
          >
            Cancelar
          </Button>
        </>
      )}
    </div>
  );
}
