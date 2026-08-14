"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";

export function DistribuirProdutoButton({ action }: { action: () => Promise<ResultadoEnfileiramento[]> }) {
  const [isPending, startTransition] = useTransition();
  const [resultados, setResultados] = useState<ResultadoEnfileiramento[] | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => setResultados(await action()))}
      >
        {isPending ? "Distribuindo..." : "Distribuir nos canais"}
      </Button>
      {resultados && (
        <ul className="space-y-1 text-sm">
          {resultados.map((r) => (
            <li key={r.canalId}>
              <span className="font-medium">{r.canal}</span>:{" "}
              {r.agendadaPara ? (
                <span>agendado para {new Date(r.agendadaPara).toLocaleString("pt-BR")}</span>
              ) : (
                <span className="text-muted-foreground">{r.motivoPulado}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
