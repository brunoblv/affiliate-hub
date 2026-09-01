"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { distribuirProdutoAction } from "@/app/admin/(dashboard)/produtos/actions";
import type { ResultadoEnfileiramento } from "@/lib/agenda/enfileirar";
import { formatarIsoLocal } from "@/lib/agenda/fuso";

export function DistribuirProdutoButton({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resultados, setResultados] = useState<ResultadoEnfileiramento[] | null>(null);

  function distribuir() {
    startTransition(async () => {
      const toastId = toast.loading("Distribuindo nos canais...");
      try {
        const lista = await distribuirProdutoAction(produtoId);
        setResultados(lista);

        const agendados = lista.filter((r) => r.agendadaPara).length;
        if (agendados > 0) {
          toast.success(
            agendados === 1 ? "1 publicação entrou na fila." : `${agendados} publicações entraram na fila.`,
            {
              id: toastId,
              action: {
                label: "Ver fila",
                onClick: () => router.push("/admin/fila"),
              },
            },
          );
        } else {
          toast.warning(lista[0]?.motivoPulado ?? "Nenhum canal recebeu o produto.", { id: toastId, duration: 8000 });
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao distribuir o produto.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={isPending} onClick={distribuir}>
        {isPending ? "Distribuindo..." : "Distribuir nos canais"}
      </Button>
      {resultados && resultados.length > 0 && (
        <ul className="space-y-1 text-sm">
          {resultados.map((r) => (
            <li key={r.canalId}>
              <span className="font-medium">{r.canal}</span>:{" "}
              {r.agendadaPara ? (
                <span>agendado para {formatarIsoLocal(r.agendadaPara)}</span>
              ) : (
                <span className="text-muted-foreground">{r.motivoPulado}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {resultados?.some((r) => r.agendadaPara) && (
        <p className="text-sm">
          <Link href="/admin/fila" className="underline underline-offset-4">
            Abrir a fila
          </Link>
        </p>
      )}
    </div>
  );
}
