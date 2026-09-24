"use client";
import { useEffect, useRef } from "react";

/** Prefetch e renderização do servidor não contam visualizações. */
export function MetricView({ token, eventKey }: { token: string | null; eventKey: string }) {
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!token) return;
    const record = () => {
      if (document.visibilityState !== "visible" || lastSent.current === eventKey) return;
      lastSent.current = eventKey;
      void fetch("/api/metricas", { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "text/plain" }, body: token,
      }).catch(() => { /* Métricas nunca interrompem a navegação. */ });
    };
    record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [token, eventKey]);
  return null;
}
