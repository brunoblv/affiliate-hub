"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import { salvarConfiguracaoVitrineAction, type VitrineFormState } from "@/app/admin/(dashboard)/vitrine/actions";
import type { DadosConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import type { Destino } from "@/lib/database/enums";

export function ConfiguracaoVitrineForm({
  destino,
  config,
}: {
  destino: Destino;
  config: DadosConfiguracaoVitrine;
}) {
  const [state, formAction, isPending] = useActionState<VitrineFormState, FormData>(
    salvarConfiguracaoVitrineAction,
    { status: "idle" },
  );
  useFeedbackFormulario(state);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="destino" value={destino} />

      <div className="space-y-1.5">
        <Label htmlFor={`modo-${destino}`}>Modo</Label>
        <select
          id={`modo-${destino}`}
          name="modo"
          defaultValue={config.modo}
          className="h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="NORMAL">Normal (posts individuais)</option>
          <option value="VITRINE">Vitrine (landing diária + 1 post de divulgação)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Vitrine gera uma landing por dia e enfileira um post apontando para ela. O modo Normal não muda.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`descontoMinimoPct-${destino}`}>Desconto mínimo (%)</Label>
          <Input
            id={`descontoMinimoPct-${destino}`}
            name="descontoMinimoPct"
            type="number"
            min={0}
            max={90}
            defaultValue={config.descontoMinimoPct}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`tetoAcessivel-${destino}`}>Teto acessível (R$)</Label>
          <Input
            id={`tetoAcessivel-${destino}`}
            name="tetoAcessivel"
            type="number"
            step="0.01"
            min={1}
            defaultValue={config.tetoAcessivel}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`tetoIntermediario-${destino}`}>Teto intermediário (R$)</Label>
          <Input
            id={`tetoIntermediario-${destino}`}
            name="tetoIntermediario"
            type="number"
            step="0.01"
            min={1}
            defaultValue={config.tetoIntermediario}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`cotaAcessivelPct-${destino}`}>Cota acessível (%)</Label>
          <Input
            id={`cotaAcessivelPct-${destino}`}
            name="cotaAcessivelPct"
            type="number"
            min={0}
            max={100}
            defaultValue={config.cotaAcessivelPct}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`quantidadeItens-${destino}`}>Itens por landing</Label>
          <Input
            id={`quantidadeItens-${destino}`}
            name="quantidadeItens"
            type="number"
            min={4}
            max={40}
            defaultValue={config.quantidadeItens}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`maxPorCategoria-${destino}`}>Máx. por categoria</Label>
          <Input
            id={`maxPorCategoria-${destino}`}
            name="maxPorCategoria"
            type="number"
            min={1}
            max={10}
            defaultValue={config.maxPorCategoria}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`linkGrupoWhatsapp-${destino}`}>Convite WhatsApp (opcional)</Label>
          <Input
            id={`linkGrupoWhatsapp-${destino}`}
            name="linkGrupoWhatsapp"
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            defaultValue={config.linkGrupoWhatsapp ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`linkGrupoTelegram-${destino}`}>Convite Telegram (opcional)</Label>
          <Input
            id={`linkGrupoTelegram-${destino}`}
            name="linkGrupoTelegram"
            type="url"
            placeholder="https://t.me/..."
            defaultValue={config.linkGrupoTelegram ?? ""}
          />
        </div>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar configuração"}
      </Button>
    </form>
  );
}
