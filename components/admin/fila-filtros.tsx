"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rede } from "@/lib/database/enums";
import { hrefFila, type RedeFila } from "@/lib/agenda/fila-admin";

export function FilaFiltros({
  dia,
  verTodos,
  rede,
  canalId,
  canais,
  dias,
  redes,
  totalTodos,
}: {
  dia: string;
  verTodos: boolean;
  rede: RedeFila;
  canalId: string | null;
  canais: { id: string; nome: string; ativo: boolean; rede: Rede }[];
  dias: { chave: string; rotulo: string; count: number }[];
  redes: { id: Rede; label: string; count: number }[];
  totalTodos: number;
}) {
  const router = useRouter();
  const diaNaUrl = verTodos ? "todos" : dia;
  const ehWhatsapp = rede === Rede.WHATSAPP;
  const canaisDaRede = rede === "todas" ? canais : canais.filter((canal) => canal.rede === rede);
  const totalRedes = redes.reduce((soma, item) => soma + item.count, 0);

  function irPara(proximo: { dia?: string | null; rede?: RedeFila; canalId?: string | null }) {
    router.push(
      hrefFila({
        dia: proximo.dia === undefined ? diaNaUrl : proximo.dia,
        rede: proximo.rede ?? rede,
        canalId: proximo.canalId === undefined ? canalId : proximo.canalId,
      }),
    );
  }

  return (
    <div className="space-y-3">
      <nav aria-label="Filtrar fila por rede" className="inline-flex min-h-8 flex-wrap items-center rounded-lg bg-muted p-[3px]">
        {redes.map((item) => {
          const ativo = rede === item.id;
          return (
            <Link
              key={item.id}
              href={hrefFila({ dia: diaNaUrl, rede: item.id })}
              className={cn(
                "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 text-sm font-medium transition-colors",
                ativo ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
              )}
            >
              {item.label}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{item.count}</span>
            </Link>
          );
        })}
        <Link
          href={hrefFila({ dia: diaNaUrl, rede: "todas" })}
          className={cn(
            "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 text-sm font-medium transition-colors",
            rede === "todas" ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
          )}
        >
          Todas
          <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{totalRedes}</span>
        </Link>
      </nav>

      <nav aria-label="Filtrar fila por dia" className="inline-flex min-h-8 flex-wrap items-center rounded-lg bg-muted p-[3px]">
        {dias.map((item) => {
          const ativo = !verTodos && item.chave === dia;
          return (
            <Link
              key={item.chave}
              href={hrefFila({ dia: item.chave, rede, canalId })}
              className={cn(
                "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 text-sm font-medium transition-colors",
                ativo ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
              )}
            >
              {item.rotulo}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{item.count}</span>
            </Link>
          );
        })}
        <Link
          href={hrefFila({ dia: "todos", rede, canalId })}
          className={cn(
            "inline-flex h-[calc(100%-1px)] items-center rounded-md px-3 text-sm font-medium transition-colors",
            verTodos ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
          )}
        >
          Todos os dias
          <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{totalTodos}</span>
        </Link>
      </nav>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fila-dia">Dia</Label>
          <Input
            id="fila-dia"
            type="date"
            className="w-40"
            value={verTodos ? "" : dia}
            onChange={(evento) => {
              const valor = evento.target.value;
              irPara({ dia: valor || "todos" });
            }}
          />
        </div>
        {canaisDaRede.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="fila-canal">{ehWhatsapp ? "Grupo" : "Canal"}</Label>
            <Select
              value={canalId ?? "todos"}
              onValueChange={(valor) => irPara({ canalId: !valor || valor === "todos" ? null : valor })}
            >
              <SelectTrigger id="fila-canal" className="min-w-56">
                <SelectValue placeholder={ehWhatsapp ? "Todos os grupos" : "Todos os canais"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{ehWhatsapp ? "Todos os grupos" : "Todos os canais"}</SelectItem>
                {canaisDaRede.map((canal) => (
                  <SelectItem key={canal.id} value={canal.id}>
                    {canal.ativo ? canal.nome : `${canal.nome} (inativo)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
