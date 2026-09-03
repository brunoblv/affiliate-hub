"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { gravarConsentimento, lerConsentimento } from "./consentimento";

export function CookieBanner() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    if (lerConsentimento()) setVisivel(false);
  }, []);

  if (!visivel) return null;

  function decidir(valor: "accepted" | "rejected") {
    gravarConsentimento(valor);
    setVisivel(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-5 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-10"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Usamos cookies para medir audiência (Google Analytics) e, quando os anúncios
          estiverem no ar, para veicular publicidade do Google AdSense. Essenciais do
          site continuam funcionando se você recusar. Detalhes na{" "}
          <Link href="/privacy-policy" className="font-semibold text-foreground underline">
            política de privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => decidir("rejected")}>
            Recusar
          </Button>
          <Button type="button" onClick={() => decidir("accepted")}>
            Aceitar cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
