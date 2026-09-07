import { formatarLocal } from "@/lib/agenda/fuso";
import type { DiagnosticoFila } from "@/lib/agenda/fila-diagnostico";

export function FilaDiagnostico({ diagnostico }: { diagnostico: DiagnosticoFila }) {
  const { workerAtivo, workerUltimoPulso, vencidasWhatsapp, aguardandoHorarioWhatsapp, publicandoWhatsapp, ultimoErro } =
    diagnostico;

  if (workerAtivo && vencidasWhatsapp === 0 && publicandoWhatsapp === 0 && !ultimoErro) {
    return null;
  }

  const pulso = workerUltimoPulso ? formatarLocal(workerUltimoPulso) : "nunca";

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <p className="font-medium">Por que o WhatsApp não sai</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          Worker: {workerAtivo ? "rodando" : "parado ou sem pulso"}
          {workerUltimoPulso ? ` (último pulso ${pulso})` : " — o `next start` não publica; precisa do processo `affiliate-hub-workers`."}
        </li>
        <li>
          Pendentes de WhatsApp já no horário: {vencidasWhatsapp}. Ainda no futuro: {aguardandoHorarioWhatsapp}.
          {vencidasWhatsapp > 0 && !workerAtivo
            ? " Horário já passou — sem worker elas ficam PENDENTE para sempre."
            : null}
        </li>
        {publicandoWhatsapp > 0 ? (
          <li>
            {publicandoWhatsapp} item{publicandoWhatsapp === 1 ? "" : "s"} em PUBLICANDO — o worker travou no
            WhatsApp (sessão/QR). Na VPS: <code className="text-xs">pm2 logs affiliate-hub-workers</code> e{" "}
            <code className="text-xs">npm run whatsapp:login</code>.
          </li>
        ) : null}
        {ultimoErro ? (
          <li>
            Último erro ({ultimoErro.area}, {formatarLocal(ultimoErro.quando)}): {ultimoErro.mensagem}
          </li>
        ) : null}
      </ul>
      {!workerAtivo ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Na VPS: <code>pm2 status</code> → <code>pm2 logs affiliate-hub-workers --lines 80</code> → se estiver
          stopped, <code>pm2 restart affiliate-hub-workers</code>.
        </p>
      ) : null}
    </div>
  );
}
