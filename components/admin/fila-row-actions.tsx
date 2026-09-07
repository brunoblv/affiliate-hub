"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelarPublicacaoAction,
  publicarAgoraAction,
  republicarAction,
  reagendarAction,
} from "@/app/admin/(dashboard)/fila/actions";
import { paraInputDatetimeLocal } from "@/lib/agenda/fuso";

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
    const valor = prompt("Nova data/hora em Brasília (AAAA-MM-DDTHH:mm)", paraInputDatetimeLocal(new Date(agendadaPara)));
    if (!valor) return;
    executar("Reagendando...", "Publicação reagendada.", () => reagendarAction(id, valor));
  }

  function publicarAgora() {
    if (
      !confirm(
        "Publicar agora? O post sai neste instante, sem esperar o horário agendado.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading("Publicando agora...");
      try {
        const resultado = await publicarAgoraAction(id);
        if (resultado.publicada) {
          toast.success("Publicado.", { id: toastId });
        } else {
          toast.error(resultado.erro ?? "Não foi possível publicar agora.", { id: toastId, duration: 8000 });
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível publicar agora.", { id: toastId });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDENTE" && (
        <Button type="button" size="sm" disabled={isPending} onClick={publicarAgora}>
          Publicar agora
        </Button>
      )}
      {status === "FALHOU" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            executar("Republicando...", "Publicação de volta na fila.", () => republicarAction(id))
          }
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
