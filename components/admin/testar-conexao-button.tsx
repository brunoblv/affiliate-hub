"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoTeste } from "@/app/admin/(dashboard)/canais/actions";

export function TestarConexaoButton({ action }: { action: () => Promise<ResultadoTeste> }) {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => setResultado(await action()))}
      >
        {isPending ? "Testando..." : "Testar conexão"}
      </Button>
      {resultado && (
        <p className={`text-sm ${resultado.ok ? "text-foreground" : "text-destructive"}`}>{resultado.mensagem}</p>
      )}
    </div>
  );
}
