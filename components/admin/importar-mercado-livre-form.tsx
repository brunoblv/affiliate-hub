"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";

export function ImportarMercadoLivreForm({
  action,
}: {
  action: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(action, { status: "idle" });

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="idExterno">ID do anúncio</Label>
        <Input id="idExterno" name="idExterno" placeholder="MLB1234567890" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="linkAfiliado">Link de afiliado</Label>
        <Input id="linkAfiliado" name="linkAfiliado" type="url" placeholder="https://..." required />
        <p className="text-xs text-muted-foreground">
          Cole o link de afiliado gerado por você — nunca vem da API automaticamente.
        </p>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Importando..." : "Importar"}
      </Button>
    </form>
  );
}
