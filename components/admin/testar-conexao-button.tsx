"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResultadoTeste } from "@/app/admin/(dashboard)/canais/actions";

export function TestarConexaoButton({ action }: { action: () => Promise<ResultadoTeste> }) {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);

  function testar() {
    startTransition(async () => {
      const toastId = toast.loading("Testando conexão...");
      try {
        const resposta = await action();
        setResultado(resposta);
        if (resposta.ok) toast.success(resposta.mensagem, { id: toastId });
        else toast.error(resposta.mensagem, { id: toastId, duration: 8000 });
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Falha ao testar a conexão.";
        setResultado({ ok: false, mensagem });
        toast.error(mensagem, { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={isPending} onClick={testar}>
        {isPending ? "Testando..." : "Testar conexão"}
      </Button>
      {resultado && (
        <p className={`text-sm ${resultado.ok ? "text-foreground" : "text-destructive"}`}>{resultado.mensagem}</p>
      )}
    </div>
  );
}
