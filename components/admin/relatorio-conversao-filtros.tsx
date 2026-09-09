"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABEL_STATUS: Record<string, string> = {
  ALL: "Todos os status",
  COMPLETED: "Completos",
  PENDING: "Pendentes",
  UNPAID: "Não pagos",
  CANCELLED: "Cancelados",
};

/** Filtros do dashboard de conversão Shopee — /admin/produtos/relatorio-conversao. */
export function RelatorioConversaoFiltros({
  inicio,
  fim,
  orderStatus,
}: {
  inicio: string;
  fim: string;
  orderStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function atualizar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(chave, valor);
    router.push(`/admin/produtos/relatorio-conversao?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="relatorio-inicio">De</Label>
        <Input
          id="relatorio-inicio"
          type="date"
          className="w-40"
          defaultValue={inicio}
          onChange={(evento) => atualizar("inicio", evento.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="relatorio-fim">Até</Label>
        <Input
          id="relatorio-fim"
          type="date"
          className="w-40"
          defaultValue={fim}
          onChange={(evento) => atualizar("fim", evento.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="relatorio-status">Status do pedido</Label>
        <Select value={orderStatus} onValueChange={(valor) => valor && atualizar("orderStatus", valor)}>
          <SelectTrigger id="relatorio-status" className="min-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LABEL_STATUS).map(([valor, rotulo]) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
