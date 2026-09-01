"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  enfileirarNosHorariosVaziosAction,
  type ResultadoDistribuicaoEmLote,
} from "@/app/admin/(dashboard)/produtos/actions";
import { formatarIsoLocal } from "@/lib/agenda/fuso";

export function EnfileirarHorariosVaziosButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lote, setLote] = useState<ResultadoDistribuicaoEmLote[] | null>(null);

  function enfileirar() {
    startTransition(async () => {
      const toastId = toast.loading("Preenchendo horários livres das 9h às 21h (Brasília)...");
      try {
        const saida = await enfileirarNosHorariosVaziosAction();
        setLote(saida);

        if (saida.length === 0) {
          toast.success("Não há horário vazio para preencher, ou todo produto ativo já está na fila.", { id: toastId });
          return;
        }

        const agendados = saida.reduce((soma, item) => soma + item.resultados.filter((r) => r.agendadaPara).length, 0);

        if (agendados > 0) {
          toast.success(
            `${agendados} publicação${agendados === 1 ? "" : "ões"} entrou${agendados === 1 ? "" : "aram"} nos horários vazios (9h–21h, Brasília).`,
            { id: toastId, action: { label: "Ver fila", onClick: () => router.push("/admin/fila") } },
          );
        } else {
          toast.warning(
            "Nenhum produto entrou na fila — confira os motivos abaixo (teto, cooldown ou canal inativo).",
            { id: toastId, duration: 8000 },
          );
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao enfileirar nos horários vazios.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" disabled={isPending} onClick={enfileirar}>
        <CalendarClock />
        {isPending ? "Enfileirando..." : "Enfileirar nos horários vazios"}
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
                    {r.agendadaPara ? `agendado para ${formatarIsoLocal(r.agendadaPara)}` : r.motivoPulado}
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
