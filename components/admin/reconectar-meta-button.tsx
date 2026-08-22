"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reconectarMetaAction, type ReconectarState } from "@/app/admin/(dashboard)/integracoes/actions";

export function ReconectarMetaButton() {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ReconectarState | null>(null);

  function sincronizar() {
    startTransition(async () => {
      const toastId = toast.loading("Sincronizando páginas...");
      try {
        const resposta = await reconectarMetaAction();
        setResultado(resposta);
        if (resposta.ok) toast.success(resposta.mensagem, { id: toastId });
        else toast.error(resposta.mensagem, { id: toastId, duration: 8000 });
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Falha ao sincronizar.";
        setResultado({ ok: false, mensagem });
        toast.error(mensagem, { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={sincronizar}>
        {isPending ? "Sincronizando..." : "Sincronizar páginas"}
      </Button>
      {resultado && (
        <p className={`text-xs ${resultado.ok ? "text-muted-foreground" : "text-destructive"}`}>{resultado.mensagem}</p>
      )}
    </div>
  );
}
