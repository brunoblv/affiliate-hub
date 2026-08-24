"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { publicarAgoraProdutoAction } from "@/app/admin/(dashboard)/produtos/actions";

export function PublicarAgoraProduto({
  produtoId,
  canais,
}: {
  produtoId: string;
  canais: { id: string; nome: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [canalId, setCanalId] = useState(canais[0]?.id ?? "");

  function publicar() {
    if (!canalId) return;

    startTransition(async () => {
      const toastId = toast.loading("Publicando...");
      try {
        const resultado = await publicarAgoraProdutoAction(produtoId, canalId);
        if (resultado.publicada) {
          toast.success(`Publicado em ${resultado.canal}.`, { id: toastId });
        } else {
          toast.error(resultado.motivoPulado ?? "Não foi possível publicar.", { id: toastId, duration: 8000 });
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao publicar.", { id: toastId });
      }
    });
  }

  if (canais.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum canal ativo para publicar agora.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={canalId} onValueChange={(valor) => setCanalId(valor ?? "")} disabled={isPending}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Selecione um canal" />
        </SelectTrigger>
        <SelectContent>
          {canais.map((canal) => (
            <SelectItem key={canal.id} value={canal.id}>
              {canal.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" disabled={isPending || !canalId} onClick={publicar}>
        {isPending ? "Publicando..." : "Publicar agora"}
      </Button>
    </div>
  );
}
