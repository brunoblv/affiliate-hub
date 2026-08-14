"use client";

import { useTransition } from "react";
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

  function reagendar() {
    const valor = prompt("Nova data/hora (AAAA-MM-DDTHH:mm)", agendadaPara.slice(0, 16));
    if (!valor) return;
    startTransition(() => reagendarAction(id, valor));
  }

  return (
    <div className="flex gap-2">
      {status === "FALHOU" && (
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => republicarAction(id))}>
          Republicar
        </Button>
      )}
      {(status === "PENDENTE" || status === "FALHOU") && (
        <>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={reagendar}>
            Reagendar
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => cancelarPublicacaoAction(id))}>
            Cancelar
          </Button>
        </>
      )}
    </div>
  );
}
