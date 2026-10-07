"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { larsmartImageAction, larsmartRegenerateAction, larsmartSwapAction } from "@/lib/blog/ai-actions";
import { secondaryButton } from "@/components/admin-ui";

type Feedback = { tone: "good" | "bad"; text: string } | null;

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return <p className={`text-xs ${feedback.tone === "bad" ? "text-bad" : "text-good"}`}>{feedback.text}</p>;
}

/** Ferramentas de posts gerados pelo LarSmart: imagens por produto, troca e reescrita. */
export function LarSmartTools({ postId, products, hasCover }: { postId: string; products: { slug: string; name: string; hasImage: boolean }[]; hasCover: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run(label: string, task: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setBusy(label);
    setFeedback(null);
    const result = await task().catch((error: Error) => ({ ok: false as const, error: error.message }));
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setFeedback({ tone: "good", text: success });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} onClick={() => run("cover", () => larsmartImageAction(postId, { kind: "COVER" }), "Capa gerada.")} className={secondaryButton}>
          {busy === "cover" ? "Gerando capa…" : hasCover ? "Gerar capa de novo" : "Gerar capa"}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => run("text", () => larsmartRegenerateAction(postId), "Texto reescrito (imagens mantidas).")} className={secondaryButton}>
          {busy === "text" ? "Reescrevendo…" : "Reescrever texto"}
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-line-soft rounded-lg border border-line">
        {products.map((product) => (
          <li key={product.slug} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
            <span className="min-w-0 flex-1 truncate">
              {product.name} {product.hasImage ? <span className="text-good">· com imagem</span> : null}
            </span>
            <button type="button" disabled={busy !== null} onClick={() => run(`img-${product.slug}`, () => larsmartImageAction(postId, { kind: "PRODUCT", slug: product.slug }), "Imagem de ambiente gerada e inserida antes do card.")} className={secondaryButton}>
              {busy === `img-${product.slug}` ? "Gerando…" : product.hasImage ? "Nova imagem" : "Gerar imagem"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => run(`swap-${product.slug}`, () => larsmartSwapAction(postId, product.slug), "Produto trocado.")} className={secondaryButton}>
              {busy === `swap-${product.slug}` ? "Trocando…" : "Trocar"}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted">Cada imagem é uma chamada à OpenAI (até ~1 min). As edições não salvas no formulário ao lado se perdem ao usar estas ferramentas: salve antes.</p>
      <Message feedback={feedback} />
    </div>
  );
}
