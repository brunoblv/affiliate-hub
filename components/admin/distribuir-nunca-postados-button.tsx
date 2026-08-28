"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  distribuirProdutosNuncaPostadosAction,
  type ResultadoDistribuicaoEmLote,
} from "@/app/admin/(dashboard)/produtos/actions";

export function DistribuirNuncaPostadosButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lote, setLote] = useState<ResultadoDistribuicaoEmLote[] | null>(null);

  function distribuir() {
    startTransition(async () => {
      const toastId = toast.loading("Buscando produtos nunca postados...");
      try {
        const saida = await distribuirProdutosNuncaPostadosAction();
        setLote(saida);

        if (saida.length === 0) {
          toast.success("Todo produto ativo já tem pelo menos uma publicação agendada ou feita.", { id: toastId });
          return;
        }

        const agendados = saida.reduce((soma, item) => soma + item.resultados.filter((r) => r.agendadaPara).length, 0);

        if (agendados > 0) {
          toast.success(
            `${agendados} publicação${agendados === 1 ? "" : "ões"} entrou${agendados === 1 ? "" : "aram"} na fila, de ${saida.length} produto${saida.length === 1 ? "" : "s"} nunca postado${saida.length === 1 ? "" : "s"}.`,
            { id: toastId, action: { label: "Ver fila", onClick: () => router.push("/admin/fila") } },
          );
        } else {
          toast.warning(
            `${saida.length} produto${saida.length === 1 ? "" : "s"} nunca postado${saida.length === 1 ? "" : "s"}, mas nenhum entrou na fila — confira os motivos abaixo.`,
            { id: toastId, duration: 8000 },
          );
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao distribuir os produtos.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={isPending} onClick={distribuir}>
        <SendHorizontal />
        {isPending ? "Distribuindo..." : "Enfileirar nunca postados"}
      </Button>

      {lote && lote.length > 0 && (
        <ul className="max-w-xl space-y-2 text-sm">
          {lote.map((item) => (
            <li key={item.produtoId}>
              <span className="font-medium">{item.produto}</span>
              <ul className="ml-4 list-disc text-muted-foreground">
                {item.resultados.map((r, indice) => (
                  <li key={`${r.canalId}-${indice}`}>
                    {r.canal}:{" "}
                    {r.agendadaPara ? `agendado para ${new Date(r.agendadaPara).toLocaleString("pt-BR")}` : r.motivoPulado}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {lote?.some((item) => item.resultados.some((r) => r.agendadaPara)) && (
        <p className="text-sm">
          <Link href="/admin/fila" className="underline underline-offset-4">
            Abrir a fila
          </Link>
        </p>
      )}
    </div>
  );
}
