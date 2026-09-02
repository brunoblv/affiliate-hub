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
      !confirm("Substituir o texto atual pelo artigo gerado com IA? O card do produto permanece.")
    ) {
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading("Gerando o texto do produto...");
      try {
        const resultado = await gerarFichaProdutoAction(postId);
        if (!resultado.ok) {
          toast.error(resultado.message, { id: toastId, duration: 8000 });
          return;
        }
        toast.success("Artigo gerado. Revise o texto antes de deixar publicado.", { id: toastId });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao gerar o texto.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      {fichaVazia && (
        <p className="text-sm text-muted-foreground">
          Este post está praticamente vazio — a página pública fica só com o card da loja. Gere um
          artigo com a IA (o que é, para que serve, quando vale a pena).
        </p>
      )}
      <Button type="button" variant={fichaVazia ? "default" : "outline"} disabled={isPending} onClick={gerar}>
        <Sparkles />
        {isPending ? "Gerando..." : fichaVazia ? "Gerar texto do produto" : "Regenerar texto do produto"}
      </Button>
    </div>
  );
}
