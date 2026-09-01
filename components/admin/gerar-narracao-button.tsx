"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarNarracaoAction } from "@/app/admin/(dashboard)/posts/actions";

export function GerarNarracaoButton({ postId, audioUrl }: { postId: string; audioUrl: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const toastId = toast.loading(audioUrl ? "Regenerando narração..." : "Gerando narração...");
      try {
        const resultado = await gerarNarracaoAction(postId);
        if (!resultado.ok) {
          toast.error(resultado.erro, { id: toastId, duration: 8000 });
          return;
        }
        toast.success("Narração pronta. Revise o áudio antes de publicar.", { id: toastId });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao gerar a narração.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={isPending} onClick={gerar}>
        <AudioLines />
        {isPending ? "Gerando áudio..." : audioUrl ? "Regenerar narração" : "Gerar narração (TTS)"}
      </Button>
      {audioUrl && (
        <audio controls preload="metadata" src={audioUrl} className="w-full max-w-md">
          <a href={audioUrl}>Baixar a narração</a>
        </audio>
      )}
      <p className="text-xs text-muted-foreground">
        Usa Gemini 3.1 Flash TTS (e 2.5 se a cota acabar). São 10 gerações/dia por modelo na API free — não
        dispare em lote.
      </p>
    </div>
  );
}
