"use client";

import { useEffect, useState } from "react";

async function api(method = "GET", body?: unknown) {
  const response = await fetch("/api/push", {
    method, cache: "no-store", headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível salvar a preferência.");
  return data as { publicKey: string | null; endpoints: string[]; issues: string[] };
}

export function PushSettings() {
  const [key, setKey] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Verificando notificações…");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !window.isSecureContext) {
        setMessage("Notificações indisponíveis neste navegador. No iPhone/iPad, abra o site pela Tela de Início.");
        setBusy(false); return;
      }
      setSupported(true);
      try {
        const data = await api();
        const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (cancelled) return;
        const enabled = !!subscription && data.endpoints.includes(subscription.endpoint);
        setKey(data.publicKey); setActive(enabled);
        setMessage(enabled && data.issues.includes(subscription!.endpoint)
          ? "Há avisos com falha ou entrega incerta. Confira seus alertas na conta. Desativar e ativar novamente permite novos envios, inclusive de avisos que já podem ter chegado."
          : enabled ? "Ativas neste dispositivo." : data.publicKey ? "Ative para receber seus alertas neste dispositivo." : "Notificações ainda não habilitadas pelo site.");
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Falha ao consultar notificações."); }
      finally { if (!cancelled) setBusy(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      if (active) {
        const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) { await api("DELETE", { endpoint: subscription.endpoint }); await subscription.unsubscribe(); }
        setActive(false); setMessage("Notificações desativadas neste dispositivo.");
      } else {
        // Pedido de permissão começa diretamente no clique, antes de qualquer rede.
        if (await Notification.requestPermission() !== "granted") {
          setMessage("Permissão não concedida. Você pode alterá-la nas configurações do navegador."); return;
        }
        if (!key) return;
        await navigator.serviceWorker.register("/push-sw.js", { scope: "/", updateViaCache: "none" });
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        const data = await api();
        // Uma inscrição local de outra conta nunca é reaproveitada.
        if (subscription && !data.endpoints.includes(subscription.endpoint)) {
          await subscription.unsubscribe(); subscription = null;
        }
        subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        try { await api("POST", subscription.toJSON()); }
        catch (error) { await subscription.unsubscribe(); throw error; }
        setActive(true); setMessage("Ativas neste dispositivo. Seus alertas de preço também poderão chegar por aqui.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar as notificações."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="push-title" className="rounded-[14px] border border-line bg-surface p-5">
    <h2 id="push-title" className="font-bold">Notificações neste dispositivo</h2>
    <p className="mt-2 text-sm text-muted">Avisos dos alertas de preço que você cadastrou, mesmo com o site fechado. Ative apenas em um dispositivo seu; os avisos podem aparecer na tela bloqueada.</p>
    <p role="status" className="mt-3 text-sm">{message}</p>
    {supported && (key || active) ? <button type="button" onClick={toggle} disabled={busy}
      className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50">
      {busy ? "Aguarde…" : active ? "Desativar neste dispositivo" : "Ativar notificações"}
    </button> : null}
  </section>;
}
