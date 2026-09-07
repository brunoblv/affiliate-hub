"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListRestart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reorganizarFilaDoGrupoAction } from "@/app/admin/(dashboard)/fila/actions";
import { hrefFila } from "@/lib/agenda/fila-admin";
import { Rede } from "@/lib/database/enums";

export function ReorganizarFilaGrupoButton({
  canais,
  canalIdAtual,
}: {
  canais: { id: string; nome: string; ativo: boolean; rede: Rede }[];
  canalIdAtual: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const grupos = canais.filter((canal) => canal.rede === Rede.WHATSAPP);
  const preselecionado = grupos.some((grupo) => grupo.id === canalIdAtual) ? canalIdAtual : null;
  const [canalId, setCanalId] = useState<string | null>(preselecionado);

  if (grupos.length === 0) return null;

  const escolhido = grupos.find((grupo) => grupo.id === canalId);

  function reorganizar() {
    if (!canalId || !escolhido) {
      toast.error("Escolha o grupo do WhatsApp cuja fila você quer reorganizar.");
      return;
    }

    if (
      !confirm(
        `Reorganizar a fila de ${escolhido.nome}? Os pendentes entram de novo a partir de agora (9h–21h, a cada 10–20 min). O que já saiu ou está saindo agora não muda.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading(`Reorganizando a fila de ${escolhido.nome}...`);
      try {
        const resultado = await reorganizarFilaDoGrupoAction(canalId);
        if (!resultado.ok) {
          toast.error(resultado.message, { id: toastId });
          return;
        }
        if (resultado.movidas === 0) {
          toast.success(`Nenhum pendente em ${resultado.canal}.`, { id: toastId });
          return;
        }
        toast.success(
          resultado.movidas === 1
            ? `1 publicação reorganizada em ${resultado.canal}.`
            : `${resultado.movidas} publicações reorganizadas em ${resultado.canal}.`,
          { id: toastId },
        );
        router.push(hrefFila({ dia: "todos", rede: Rede.WHATSAPP, canalId }));
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível reorganizar a fila.", { id: toastId });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="reorganizar-grupo">Reorganizar grupo</Label>
        <Select value={canalId ?? undefined} onValueChange={(valor) => setCanalId(valor)}>
          <SelectTrigger id="reorganizar-grupo" className="min-w-52">
            <SelectValue placeholder="Escolha o grupo" />
          </SelectTrigger>
          <SelectContent>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.id} value={grupo.id}>
                {grupo.ativo ? grupo.nome : `${grupo.nome} (inativo)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" disabled={isPending || !canalId} onClick={reorganizar}>
        <ListRestart />
        {isPending ? "Reorganizando..." : "Reorganizar fila"}
      </Button>
    </div>
  );
}
