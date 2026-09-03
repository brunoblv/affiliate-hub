"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";
import { OPCOES_CATEGORIA_PUBLICA } from "@/lib/produtos";

export function ImportarMercadoLivreForm({
  action,
}: {
  action: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(action, { status: "idle" });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="idExterno">ID ou link do anúncio/produto</Label>
        <Input id="idExterno" name="idExterno" placeholder="MLB1234567890 ou https://www.mercadolivre.com.br/..." required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="linkAfiliado">Link de afiliado</Label>
        <Input id="linkAfiliado" name="linkAfiliado" type="url" placeholder="https://..." required />
        <p className="text-xs text-muted-foreground">
          Cole o link de afiliado gerado por você — nunca vem da API automaticamente.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoria">Categoria (casa/lar)</Label>
        <select
          id="categoria"
          name="categoria"
          defaultValue="CASA"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {OPCOES_CATEGORIA_PUBLICA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Só entra no catálogo público se for casa. Skincare, eletrônico e suplemento são recusados.
        </p>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Importando..." : "Importar"}
      </Button>
    </form>
  );
}
