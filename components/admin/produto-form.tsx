"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { Produto } from "@/lib/database";
import type { ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";

const PLATAFORMAS = [
  { value: "MERCADO_LIVRE", label: "Mercado Livre" },
  { value: "AMAZON", label: "Amazon" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
];

const DESTINOS = [
  { value: "MEU_NOVO_LAR", label: "Meu Novo Lar" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "UMBANDA", label: "Umbanda" },
];

const CATEGORIAS = [
  { value: "COZINHA", label: "Cozinha" },
  { value: "BELEZA", label: "Beleza" },
  { value: "CASA_DECORACAO", label: "Casa e Decoração" },
  { value: "ELETRONICOS", label: "Eletrônicos" },
  { value: "MODA", label: "Moda" },
  { value: "UMBANDA_RELIGIAO", label: "Umbanda e Religião" },
  { value: "PET", label: "Pet" },
  { value: "OUTRA", label: "Outra" },
];

export function ProdutoForm({
  produto,
  action,
}: {
  produto?: Omit<Produto, "precoAtual" | "precoOriginal"> & { precoAtual: number; precoOriginal: number | null };
  action: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(action, { status: "idle" });
  const imagens = ((produto?.imagens as unknown as string[]) ?? []).join("\n");
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="plataforma">Plataforma</Label>
          <select
            id="plataforma"
            name="plataforma"
            defaultValue={produto?.plataforma ?? "MERCADO_LIVRE"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {PLATAFORMAS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="idExterno">ID na plataforma</Label>
          <Input id="idExterno" name="idExterno" defaultValue={produto?.idExterno} placeholder="MLB1234567890" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destino">Destino</Label>
        <select
          id="destino"
          name="destino"
          defaultValue={produto?.destino ?? "MEU_NOVO_LAR"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DESTINOS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Site e grupos onde este produto é divulgado — nem sempre é o mesmo da Plataforma.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categoria">Categoria</Label>
        <select
          id="categoria"
          name="categoria"
          defaultValue={produto?.categoria ?? "OUTRA"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Nicho/tema do produto — independente do Destino.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={produto?.nome} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" name="descricao" defaultValue={produto?.descricao ?? ""} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="precoAtual">Preço atual (R$)</Label>
          <Input
            id="precoAtual"
            name="precoAtual"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produto ? Number(produto.precoAtual) : undefined}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precoOriginal">Preço original (R$)</Label>
          <Input
            id="precoOriginal"
            name="precoOriginal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produto?.precoOriginal ? Number(produto.precoOriginal) : undefined}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="imagens">Imagens (uma URL por linha, até 6)</Label>
        <Textarea id="imagens" name="imagens" defaultValue={imagens} rows={3} placeholder="https://..." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="linkAfiliado">Link de afiliado</Label>
        <Input
          id="linkAfiliado"
          name="linkAfiliado"
          type="url"
          defaultValue={produto?.linkAfiliado}
          placeholder="https://..."
          required
        />
        <p className="text-xs text-muted-foreground">
          Só o link de afiliado real — nunca a URL crua da loja. Sem link cadastrado, não publique o produto.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={produto?.ativo ?? true}
          className="size-4 rounded border-input"
        />
        <Label htmlFor="ativo" className="font-normal">
          Ativo (aparece no site)
        </Label>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : produto ? "Salvar alterações" : "Criar produto"}
      </Button>
    </form>
  );
}
