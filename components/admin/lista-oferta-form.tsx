"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import { OPCOES_CATEGORIA_PUBLICA, OPCOES_PLATAFORMA } from "@/lib/produtos";
import { DESTINOS, LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { DESTINOS_LISTA_OFERTA, parseRedesListaOferta } from "@/lib/listas-oferta/destinos";
import type { ListaOferta } from "@/lib/database";
import type { ListaOfertaFormState } from "@/app/admin/(dashboard)/listas-oferta/actions";

export function ListaOfertaForm({
  lista,
  action,
}: {
  lista?: Pick<
    ListaOferta,
    "titulo" | "plataforma" | "categoria" | "destino" | "redes" | "linkAfiliado" | "ativo" | "divulgarDiario"
  >;
  action: (prev: ListaOfertaFormState, formData: FormData) => Promise<ListaOfertaFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ListaOfertaFormState, FormData>(action, { status: "idle" });
  useFeedbackFormulario(state);
  const redesMarcadas = new Set(lista ? parseRedesListaOferta(lista.redes) : ["WHATSAPP", "TELEGRAM", "FACEBOOK_PAGE"]);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="titulo">Nome da lista</Label>
          <Input id="titulo" name="titulo" defaultValue={lista?.titulo} placeholder="Ofertas de cozinha" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plataforma">Loja</Label>
          <select
            id="plataforma"
            name="plataforma"
            defaultValue={lista?.plataforma ?? "SHOPEE"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {OPCOES_PLATAFORMA.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            name="categoria"
            defaultValue={lista?.categoria ?? "COZINHA"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {OPCOES_CATEGORIA_PUBLICA.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="linkAfiliado">Link de afiliado</Label>
          <Input
            id="linkAfiliado"
            name="linkAfiliado"
            defaultValue={lista?.linkAfiliado}
            placeholder="https://s.shopee.com.br/..."
            required
          />
          <p className="text-xs text-muted-foreground">
            Cole o link curto da lista no painel da loja (Shopee: Oferta → Oferta Shopee). Nunca a URL crua do
            produto.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destino">Público</Label>
          <select
            id="destino"
            name="destino"
            defaultValue={lista?.destino ?? "MEU_NOVO_LAR"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DESTINOS.map((destino) => (
              <option key={destino} value={destino}>
                {LABEL_DESTINO[destino]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Destino</legend>
        <p className="text-xs text-muted-foreground">
          WhatsApp, Telegram e a página do Facebook entram na fila automática. Pinterest gera a legenda para você
          copiar.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DESTINOS_LISTA_OFERTA.map((destino) => (
            <label key={destino.id} className="flex items-center gap-2 text-sm font-normal">
              <input
                type="checkbox"
                name="redes"
                value={destino.id}
                defaultChecked={redesMarcadas.has(destino.id)}
                className="size-4 rounded border-input"
              />
              {destino.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-normal">
          <input id="ativo" name="ativo" type="checkbox" defaultChecked={lista?.ativo ?? true} className="size-4 rounded border-input" />
          Ativa
        </label>
        <label className="flex items-center gap-2 text-sm font-normal">
          <input
            id="divulgarDiario"
            name="divulgarDiario"
            type="checkbox"
            defaultChecked={lista?.divulgarDiario ?? true}
            className="size-4 rounded border-input"
          />
          Divulgar todo dia
        </label>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : lista ? "Salvar alterações" : "Cadastrar lista"}
      </Button>
    </form>
  );
}
