"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reconectarMetaAction, type ReconectarState } from "@/app/admin/(dashboard)/integracoes/actions";

export function ReconectarMetaButton() {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ReconectarState | null>(null);

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(async () => setResultado(await reconectarMetaAction()))}
      >
        {isPending ? "Sincronizando..." : "Sincronizar páginas"}
      </Button>
      {resultado && (
        <p className={`text-xs ${resultado.ok ? "text-muted-foreground" : "text-destructive"}`}>{resultado.mensagem}</p>
      )}
    </div>
  );
}
