"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purgarNichoAdsenseAction } from "@/app/admin/(dashboard)/produtos/actions";

export function PurgarNichoAdsenseButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function purgar() {
    const ok = window.confirm(
      "Isso apaga do Meu Novo Lar tudo que não é casa/lar e junta duplicatas (ex.: varal -2/-3) numa URL só. Continuar?",
    );
    if (!ok) return;

    startTransition(async () => {
      const toastId = toast.loading("Purgando catálogo para o AdSense...");
      const saida = await purgarNichoAdsenseAction();
      if (!saida.ok) {
        toast.error(saida.message, { id: toastId });
        return;
      }
      toast.success(
        `Fora do nicho: ${saida.foraDoNicho}. Duplicatas consolidadas: ${saida.duplicatas}.`,
        { id: toastId },
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={purgar}>
      <ShieldAlert />
      {isPending ? "Purgando..." : "Purgar fora do nicho (AdSense)"}
    </Button>
  );
}
