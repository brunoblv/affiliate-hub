"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarFichaProdutoAction } from "@/app/admin/(dashboard)/posts/actions";

export function GerarFichaProdutoButton({
  postId,
  fichaVazia,
}: {
  postId: string;
  fichaVazia: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function gerar() {
    if (
      !fichaVazia &&
      !confirm("Substituir o texto atual pela descrição e utilidade geradas com IA? O card do produto permanece.")
    ) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading("Gerando descrição e utilidade...");
      try {
        const resultado = await gerarFichaProdutoAction(postId);
        if (!resultado.ok) {
          toast.error(resultado.message, { id: toastId, duration: 8000 });
          return;
        }
        toast.success("Ficha preenchida. Revise o texto antes de publicar.", { id: toastId });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao gerar a ficha.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      {fichaVazia && (
        <p className="text-sm text-muted-foreground">
          Esta ficha está praticamente vazia — a página pública fica só com o card do produto. Gere a
          descrição e a utilidade com IA.
        </p>
      )}
      <Button type="button" variant={fichaVazia ? "default" : "outline"} disabled={isPending} onClick={gerar}>
        <Sparkles />
        {isPending ? "Gerando..." : fichaVazia ? "Gerar descrição e utilidade" : "Regenerar descrição e utilidade"}
      </Button>
    </div>
  );
}
