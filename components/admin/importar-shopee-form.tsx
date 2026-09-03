"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";
import { OPCOES_CATEGORIA_PUBLICA } from "@/lib/produtos";

const DESTINOS = [
  { value: "MEU_NOVO_LAR", label: "Meu Novo Lar" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "UMBANDA", label: "Umbanda" },
];

const CATEGORIAS = OPCOES_CATEGORIA_PUBLICA;

export function ImportarShopeeForm({
  action,
}: {
  action: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(action, { status: "idle" });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="identificador">Link do produto na Shopee</Label>
        <Input
          id="identificador"
          name="identificador"
          placeholder="https://shopee.com.br/produto-i.123456.789 ou https://s.shopee.com.br/..."
          required
        />
        <p className="text-xs text-muted-foreground">
          O link de afiliado é gerado automaticamente pela Shopee — não precisa colar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="destino">Destino</Label>
          <select
            id="destino"
            name="destino"
            defaultValue="MEU_NOVO_LAR"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DESTINOS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            name="categoria"
            defaultValue="CASA"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Importando..." : "Importar"}
      </Button>
    </form>
  );
}
