"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function useSelecaoEmLote(ids: string[]) {
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const chave = ids.join("\0");

  useEffect(() => {
    setSelecionados(new Set());
  }, [chave]);

  const todosSelecionados = ids.length > 0 && ids.every((id) => selecionados.has(id));
  const algunsSelecionados = ids.some((id) => selecionados.has(id)) && !todosSelecionados;

  function toggle(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(ids));
  }

  return {
    selecionados,
    quantidade: selecionados.size,
    todosSelecionados,
    algunsSelecionados,
    toggle,
    toggleTodos,
  };
}

export function CheckboxLote({
  checked,
  indeterminate = false,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label": string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="size-4 rounded border-input accent-primary"
    />
  );
}

export function BarraExclusaoEmLote({
  quantidade,
  rotuloSingular,
  rotuloPlural,
  isPending,
  onExcluir,
}: {
  quantidade: number;
  rotuloSingular: string;
  rotuloPlural: string;
  isPending: boolean;
  onExcluir: () => void;
}) {
  if (quantidade === 0) return null;

  const rotulo = quantidade === 1 ? rotuloSingular : rotuloPlural;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-sm">
        {quantidade} {rotulo} selecionado{quantidade === 1 ? "" : "s"}
      </p>
      <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={onExcluir}>
        <Trash2 />
        {isPending ? "Excluindo..." : "Excluir"}
      </Button>
    </div>
  );
}
