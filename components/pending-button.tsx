"use client";

import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botão de formulário com server action que mostra que está trabalhando: gira, troca o texto e
 * trava o formulário inteiro (evita clique duplo, que importaria duas vezes). Só o botão clicado
 * mostra o texto de andamento; os outros do mesmo formulário apenas ficam desabilitados.
 */
export function PendingButton({
  children,
  pendingLabel = "Processando…",
  hint,
  className = "",
  onClick,
  ...rest
}: Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: string;
  /** Aviso mostrado ao lado enquanto roda (ex.: "pode levar alguns minutos"). */
  hint?: string;
}) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState(false);
  const active = pending && clicked;

  return (
    <>
      <button
        {...rest}
        type="submit"
        disabled={pending || rest.disabled}
        aria-busy={active}
        onClick={(event) => {
          setClicked(true);
          onClick?.(event);
        }}
        className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
      >
        {active ? (
          <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {active ? pendingLabel : children}
      </button>
      {active ? (
        // Fixo na tela: o botão costuma ficar no fim de uma página longa, fora de vista.
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-[12px] bg-ink px-4 py-3 text-[13px] font-medium text-surface shadow-lg"
        >
          <span aria-hidden className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-surface border-t-transparent" />
          <span>
            {pendingLabel}
            {hint ? <span className="block text-[11px] font-normal text-ghost">{hint}</span> : null}
          </span>
        </div>
      ) : null}
    </>
  );
}
