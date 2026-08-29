"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import { criarNotaJornadaAction, type NotaJornadaFormState } from "@/app/admin/(dashboard)/jornada/actions";

export function NotaJornadaForm() {
  const [state, formAction, isPending] = useActionState<NotaJornadaFormState, FormData>(criarNotaJornadaAction, {
    status: "idle",
  });
  useFeedbackFormulario(state);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="texto">Novo bloco</Label>
        <Textarea
          id="texto"
          name="texto"
          rows={4}
          required
          placeholder="Conte um pedaço real da sua jornada: por que decidiu comprar, como foi escolher o bairro, um perrengue do financiamento, como foi o dia da mudança..."
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adicionando..." : "Adicionar bloco"}
      </Button>
    </form>
  );
}
