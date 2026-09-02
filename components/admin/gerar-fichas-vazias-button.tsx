"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarFichasVaziasEmLoteAction } from "@/app/admin/(dashboard)/posts/actions";

export function GerarFichasVaziasButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const toastId = toast.loading("Gerando texto dos posts de produto vazios (até 3 por vez)...");
      try {
        const resultado = await gerarFichasVaziasEmLoteAction();
        if (!resultado.ok) {
          toast.error(resultado.message, { id: toastId, duration: 8000 });
          return;
        }
        if (resultado.geradas === 0 && resultado.falhas === 0 && resultado.restantes === 0) {
          toast.success("Nenhum post de produto vazio — todos já têm texto.", { id: toastId });
        } else if (resultado.geradas === 0) {
          toast.warning(
            `Nenhum artigo gerado (${resultado.falhas} falha${resultado.falhas === 1 ? "" : "s"}). Tente de novo.`,
            { id: toastId, duration: 8000 },
          );
        } else {
          const resto =
            resultado.restantes > 0
              ? ` Ainda restam ${resultado.restantes} — clique de novo para o próximo lote.`
              : "";
          toast.success(
            `${resultado.geradas} post${resultado.geradas === 1 ? "" : "s"} preenchido${resultado.geradas === 1 ? "" : "s"}.${resto}`,
            { id: toastId, duration: 8000 },
          );
        }
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao gerar os textos.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={gerar}>
      <Sparkles />
      {isPending ? "Gerando textos..." : "Preencher posts de produto vazios"}
    </Button>
  );
}
