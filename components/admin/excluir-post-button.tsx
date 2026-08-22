"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePostAction } from "@/app/admin/(dashboard)/posts/actions";

export function ExcluirPostButton({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm(`Excluir "${titulo}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const toastId = toast.loading("Excluindo post...");
      try {
        const resultado = await deletePostAction(id);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success("Post excluído.", { id: toastId });
        router.push("/admin/posts");
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={isPending} onClick={excluir}>
      <Trash2 />
      {isPending ? "Excluindo..." : "Excluir post"}
    </Button>
  );
}
