"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Selecionar todos" para uma lista de checkboxes `name` dentro do mesmo formulário, com contador.
 * Só mexe nos habilitados; fica marcado pela metade quando a seleção é parcial.
 */
export function SelectAll({ name = "sel", label = "Selecionar todos" }: { name?: string; label?: string }) {
  const box = useRef<HTMLInputElement>(null);
  const [state, setState] = useState({ checked: 0, total: 0 });

  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const items = () => [...form.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]:not(:disabled)`)];
    const refresh = () => {
      const all = items();
      setState({ checked: all.filter((item) => item.checked).length, total: all.length });
    };
    refresh();
    form.addEventListener("change", refresh);
    return () => form.removeEventListener("change", refresh);
  }, [name]);

  useEffect(() => {
    if (box.current) box.current.indeterminate = state.checked > 0 && state.checked < state.total;
  }, [state]);

  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold">
      <input
        ref={box}
        type="checkbox"
        checked={state.total > 0 && state.checked === state.total}
        disabled={state.total === 0}
        onChange={(event) => {
          const form = box.current?.closest("form");
          form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]:not(:disabled)`).forEach((item) => {
            item.checked = event.target.checked;
          });
          form?.dispatchEvent(new Event("change"));
        }}
      />
      {label}
      <span className="font-normal text-muted">
        · {state.checked} de {state.total} selecionados
      </span>
    </label>
  );
}
