"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToNewsletterAction, type SubscribeState } from "./newsletter-actions";

const initialState: SubscribeState = { status: "idle" };

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeToNewsletterAction, initialState);

  if (state.status === "success") {
    return <p className="text-sm font-medium text-foreground">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2.5">
        <input
          type="email"
          name="email"
          required
          placeholder="seu@email.com"
          className="min-w-[220px] rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button size="lg" className="px-5" type="submit" disabled={isPending}>
          {isPending ? "Enviando…" : "Quero receber"}
        </Button>
      </div>
      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
