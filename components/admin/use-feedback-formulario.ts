"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Mostra toast quando um formulário com useActionState termina de salvar. */
export function useFeedbackFormulario(state: { status: string; message?: string }) {
  const anterior = useRef(state);

  useEffect(() => {
    if (state === anterior.current) return;
    anterior.current = state;

    if (state.status === "success") toast.success(state.message ?? "Salvo.");
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}
