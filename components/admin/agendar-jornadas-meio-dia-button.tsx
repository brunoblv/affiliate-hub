"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  agendarJornadasNosDiasVaziosAction,
} from "@/app/admin/(dashboard)/posts/actions";
import type { ResultadoDistribuicaoDePost } from "@/lib/agenda/enfileirar";
import { formatarIsoLocal } from "@/lib/agenda/fuso";

export function AgendarJornadasMeioDiaButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lote, setLote] = useState<ResultadoDistribuicaoDePost[] | null>(null);

  function agendar() {
    startTransition(async () => {
      const toastId = toast.loading("Agendando matérias de jornada nos dias vazios às 12h (Brasília)...");
      try {
        const saida = await agendarJornadasNosDiasVaziosAction();
        setLote(saida);

        if (saida.length === 0) {
          toast.success("Não há dia vazio às 12h, ou toda jornada publicada já está na fila.", { id: toastId });
          return;
        }

        const agendados = saida.reduce((soma, item) => soma + item.resultados.filter((r) => r.agendadaPara).length, 0);

        if (agendados > 0) {
          toast.success(
            `${agendados} publicação${agendados === 1 ? "" : "ões"} nas páginas do Facebook e Instagram (12h, Brasília).`,
            { id: toastId, action: { label: "Ver fila", onClick: () => router.push("/admin/fila") } },
          );
        } else {
          toast.warning(
            "Nenhuma matéria entrou na fila — confira os motivos abaixo (canal inativo, já agendada ou 12h ocupada).",
            { id: toastId, duration: 8000 },
          );
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao agendar as jornadas.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" disabled={isPending} onClick={agendar}>
        <CalendarClock />
        {isPending ? "Agendando..." : "Agendar nos dias vazios às 12h"}
      </Button>

      {lote && lote.length > 0 && (
        <ul className="max-w-xl space-y-2 text-sm">
          {lote.map((item) => (
            <li key={item.postId}>
              <span className="font-medium">{item.post}</span>
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
