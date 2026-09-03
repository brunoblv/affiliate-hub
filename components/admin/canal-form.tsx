"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { Canal } from "@/lib/database";
import type { CanalFormState } from "@/app/admin/(dashboard)/canais/actions";
import { etiquetaDoCanal } from "@/lib/shopee/etiquetas";
import { INTERVALO_PADRAO_MIN, TETO_PADRAO, rotuloJanela } from "@/lib/agenda/janela";

const REDES = [
  { value: "FACEBOOK_PAGE", label: "Página do Facebook" },
  { value: "FACEBOOK_GROUP", label: "Grupo do Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

const DESTINOS = [
  { value: "MEU_NOVO_LAR", label: "Meu Novo Lar" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "UMBANDA", label: "Umbanda" },
];

export function CanalForm({
  canal,
  action,
}: {
  canal?: Canal;
  action: (prev: CanalFormState, formData: FormData) => Promise<CanalFormState>;
}) {
  const [state, formAction, isPending] = useActionState<CanalFormState, FormData>(action, { status: "idle" });
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={canal?.nome} placeholder="Página Meu Novo Lar" required />
          <p className="text-xs text-muted-foreground">
            A etiqueta da Shopee sai da rede + nome
            {canal ? (
              <>
                : <span className="font-mono">{etiquetaDoCanal(canal)}</span>
              </>
            ) : (
              <> (ex.: facebook-meu-novo-lar, facebook-achadinhos)</>
            )}
            .
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rede">Rede</Label>
          <select
            id="rede"
            name="rede"
            defaultValue={canal?.rede ?? "FACEBOOK_PAGE"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {REDES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destino">Destino</Label>
        <select
          id="destino"
          name="destino"
          defaultValue={canal?.destino ?? "MEU_NOVO_LAR"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DESTINOS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Só produtos deste destino são distribuídos por este canal.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="idExterno">Identificador externo</Label>
        <Input
          id="idExterno"
          name="idExterno"
          defaultValue={canal?.idExterno}
          placeholder="page_id / group_id / ig_user_id / chat_id / JID do grupo (WhatsApp)"
          required
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Janela de publicação</p>
        <p className="text-sm text-muted-foreground">{rotuloJanela(canal?.intervaloMinimoMin ?? INTERVALO_PADRAO_MIN)}</p>
        <p className="text-xs text-muted-foreground">
          Os horários são gerados automaticamente no fuso de Brasília. Nada é agendado antes das 9h nem depois das 21h.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="intervaloMinimoMin">Intervalo mínimo (min)</Label>
          <Input id="intervaloMinimoMin" name="intervaloMinimoMin" type="number" min="1" defaultValue={canal?.intervaloMinimoMin ?? INTERVALO_PADRAO_MIN} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tetoDiario">Teto diário</Label>
          <Input id="tetoDiario" name="tetoDiario" type="number" min="1" defaultValue={canal?.tetoDiario ?? TETO_PADRAO} />
          <p className="text-xs text-muted-foreground">Com 10 min das 9h às 21h cabem {TETO_PADRAO} posts.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cooldownDias">Cooldown (dias)</Label>
          <Input id="cooldownDias" name="cooldownDias" type="number" min="0" defaultValue={canal?.cooldownDias ?? 30} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input id="ativo" name="ativo" type="checkbox" defaultChecked={canal?.ativo ?? true} className="size-4 rounded border-input" />
        <Label htmlFor="ativo" className="font-normal">
          Ativo
        </Label>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : canal ? "Salvar alterações" : "Criar canal"}
      </Button>
    </form>
  );
}
