"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gerarLandingAgoraAction } from "@/app/admin/(dashboard)/vitrine/actions";
import type { Destino } from "@/lib/database/enums";

export function GerarLandingButton({ destino }: { destino: Destino }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const toastId = toast.loading("Gerando landing do dia...");
      try {
        const resultado = await gerarLandingAgoraAction(destino);
        if (resultado.status === "publicada") {
          toast.success(
            `Landing publicada (${resultado.quantidadeItens} itens)${resultado.textosViaGemini ? " com Gemini" : " com texto template"}.`,
            { id: toastId },
          );
          router.refresh();
          return;
        }
        if (resultado.status === "pulada") {
          toast.success(resultado.motivo ?? "Landing do dia já existia.", { id: toastId });
          router.refresh();
          return;
        }
        toast.error(resultado.motivo ?? "Falha ao gerar a landing.", { id: toastId });
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao gerar a landing.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" disabled={isPending} onClick={gerar}>
      {isPending ? "Gerando..." : "Gerar landing agora"}
    </Button>
  );
}
