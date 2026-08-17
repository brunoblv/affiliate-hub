"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePostAction } from "@/app/admin/(dashboard)/posts/actions";

export function ExcluirPostButton({ id, titulo }: { id: string; titulo: string }) {
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm(`Excluir "${titulo}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(() => deletePostAction(id));
  }

  return (
    <Button type="button" variant="destructive" disabled={isPending} onClick={excluir}>
      <Trash2 />
      {isPending ? "Excluindo..." : "Excluir post"}
    </Button>
  );
}
