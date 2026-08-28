"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import { atualizarConfiguracaoShopeeAction, type ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";

export function ConfiguracaoShopeeForm({
  shopeeDescobertaLimiteDiario,
  shopeeComissaoMinimaPct,
}: {
  shopeeDescobertaLimiteDiario: number;
  shopeeComissaoMinimaPct: number;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(atualizarConfiguracaoShopeeAction, {
    status: "idle",
  });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="shopeeDescobertaLimiteDiario">Limite diário de importação</Label>
        <Input
          id="shopeeDescobertaLimiteDiario"
          name="shopeeDescobertaLimiteDiario"
          type="number"
          min="1"
          defaultValue={shopeeDescobertaLimiteDiario}
          className="w-32"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shopeeComissaoMinimaPct">Comissão mínima (%)</Label>
        <Input
          id="shopeeComissaoMinimaPct"
          name="shopeeComissaoMinimaPct"
          type="number"
          min="0"
          max="100"
          defaultValue={shopeeComissaoMinimaPct}
          className="w-32"
        />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
