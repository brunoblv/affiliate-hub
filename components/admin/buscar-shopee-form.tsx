"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { BuscaShopeeState, ProdutoFormState } from "@/app/admin/(dashboard)/produtos/actions";
import type { OfertaShopee } from "@/lib/shopee/client";

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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OfertaCard({
  oferta,
  importarAction,
}: {
  oferta: OfertaShopee;
  importarAction: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ProdutoFormState, FormData>(importarAction, { status: "idle" });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="flex gap-4 rounded-lg border border-border p-4">
      <input type="hidden" name="shopId" value={oferta.shopId} />
      <input type="hidden" name="itemId" value={oferta.itemId} />

      <div className="flex aspect-square w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {oferta.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={oferta.imagemUrl} alt={oferta.nome} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">sem imagem</span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="line-clamp-2 text-sm font-semibold">{oferta.nome}</div>
        <div className="flex flex-wrap items-baseline gap-2 text-sm">
          {oferta.precoOriginal && (
            <span className="text-xs text-muted-foreground line-through">{formatCurrency(oferta.precoOriginal)}</span>
          )}
          <span className="font-bold">{formatCurrency(oferta.precoAtual)}</span>
          {oferta.comissaoPercentual !== null && (
            <span className="text-xs text-muted-foreground">comissão {oferta.comissaoPercentual.toFixed(1)}%</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            name="destino"
            defaultValue="MEU_NOVO_LAR"
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DESTINOS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            name="categoria"
            defaultValue="OUTRA"
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Importando..." : "Importar"}
          </Button>
        </div>

        {state.status === "error" && <p className="text-xs text-destructive">{state.message}</p>}
      </div>
    </form>
  );
}

export function BuscarShopeeForm({
  buscarAction,
  importarAction,
}: {
  buscarAction: (prev: BuscaShopeeState, formData: FormData) => Promise<BuscaShopeeState>;
  importarAction: (prev: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
}) {
  const [state, formAction, isPending] = useActionState<BuscaShopeeState, FormData>(buscarAction, { status: "idle" });
  const [ultimaBusca, setUltimaBusca] = useState("");

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          setUltimaBusca(String(formData.get("keyword") ?? ""));
          return formAction(formData);
        }}
        className="flex max-w-lg items-end gap-3"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="keyword">Palavra-chave</Label>
          <Input id="keyword" name="keyword" placeholder="fone bluetooth" required />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}
      {state.status === "success" && state.ofertas?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma oferta encontrada pra &quot;{ultimaBusca}&quot;.</p>
      )}

      {state.ofertas && state.ofertas.length > 0 && (
        <div className="max-w-2xl space-y-3">
          {state.ofertas.map((oferta) => (
            <OfertaCard key={`${oferta.shopId}_${oferta.itemId}`} oferta={oferta} importarAction={importarAction} />
          ))}
        </div>
      )}
    </div>
  );
}
