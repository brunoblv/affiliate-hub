"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rodarDescobertaShopeeAction } from "@/app/admin/(dashboard)/produtos/actions";

export function RodarDescobertaShopeeButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function rodar() {
    startTransition(async () => {
      const toastId = toast.loading("Buscando ofertas do dia na Shopee...");
      try {
        const resultado = await rodarDescobertaShopeeAction();
        if (resultado.status === "success") {
          toast.success(resultado.message ?? "Descoberta concluída.", { id: toastId });
          router.refresh();
        } else {
          toast.error(resultado.message ?? "Falha ao rodar a descoberta automática.", { id: toastId });
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao rodar a descoberta automática.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={rodar}>
      {isPending ? "Buscando..." : "Rodar descoberta agora"}
    </Button>
  );
}
