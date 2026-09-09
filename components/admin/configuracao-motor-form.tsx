"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import { atualizarConfiguracaoMotorAction, type ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";

/** Thresholds/pesos do motor de produtos (Fase 1: Shopee) — ver classificar-produtos.ts. */
export function ConfiguracaoMotorForm({
  motorPercentilVendeBem,
  motorDescontoMinimoPct,
  motorPesoVendas,
  motorPesoDesconto,
  motorPesoComissao,
}: {
  motorPercentilVendeBem: number;
  motorDescontoMinimoPct: number;
  motorPesoVendas: number;
  motorPesoDesconto: number;
  motorPesoComissao: number;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(atualizarConfiguracaoMotorAction, {
    status: "idle",
  });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="motorPercentilVendeBem">Percentil &quot;vende bem&quot;</Label>
        <Input
          id="motorPercentilVendeBem"
          name="motorPercentilVendeBem"
          type="number"
          min="1"
          max="99"
          defaultValue={motorPercentilVendeBem}
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motorDescontoMinimoPct">Desconto mínimo (%)</Label>
        <Input
          id="motorDescontoMinimoPct"
          name="motorDescontoMinimoPct"
          type="number"
          min="0"
          max="100"
          defaultValue={motorDescontoMinimoPct}
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motorPesoVendas">Peso vendas</Label>
        <Input
          id="motorPesoVendas"
          name="motorPesoVendas"
          type="number"
          step="0.1"
          min="0"
          defaultValue={motorPesoVendas}
          className="w-20"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motorPesoDesconto">Peso desconto</Label>
        <Input
          id="motorPesoDesconto"
          name="motorPesoDesconto"
          type="number"
          step="0.1"
          min="0"
          defaultValue={motorPesoDesconto}
          className="w-20"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motorPesoComissao">Peso comissão</Label>
        <Input
          id="motorPesoComissao"
          name="motorPesoComissao"
          type="number"
          step="0.1"
          min="0"
          defaultValue={motorPesoComissao}
          className="w-20"
        />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
