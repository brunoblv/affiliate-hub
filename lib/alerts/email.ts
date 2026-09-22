import { money } from "@/lib/format";
import type { Mail } from "@/lib/mail";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * E-mail do alerta de preço. O link aponta para a página do produto no próprio site
 * (a comparação), nunca direto para uma loja: quem escolhe a oferta é o leitor.
 */
export function buildAlertEmail(input: {
  to: string;
  userName: string | null;
  productName: string;
  productUrl: string;
  contaUrl: string;
  priceCents: number;
  targetCents: number;
}): Mail {
  const price = money(input.priceCents);
  const target = money(input.targetCents);
  const greeting = input.userName ? `Olá, ${input.userName.split(" ")[0]}!` : "Olá!";

  const text = [
    greeting,
    "",
    `O menor preço de "${input.productName}" chegou a ${price}, dentro da meta que você definiu (${target}).`,
    "",
    `Compare as ofertas: ${input.productUrl}`,
    "",
    "Preço e disponibilidade finais são confirmados na loja e podem mudar a qualquer momento.",
    `Você recebeu este aviso porque criou um alerta de preço. Para alterá-lo ou removê-lo: ${input.contaUrl}`,
  ].join("\n");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#17212b">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#fff;border:1px solid #e6e8ec;border-radius:14px;padding:28px">
    <p style="margin:0 0 12px;font-size:15px">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.5">O menor preço de <strong>${escapeHtml(input.productName)}</strong> chegou à sua meta:</p>
    <p style="margin:14px 0;font-size:34px;font-weight:800;letter-spacing:-0.03em">${escapeHtml(price)}</p>
    <p style="margin:0 0 22px;font-size:13px;color:#5b6573">Sua meta era ${escapeHtml(target)}.</p>
    <a href="${escapeHtml(input.productUrl)}" style="display:inline-block;background:#5b5ce2;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px">Comparar as ofertas</a>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#5b6573">Preço e disponibilidade finais são confirmados na loja e podem mudar a qualquer momento.</p>
  </div>
  <p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#7a8492">Você recebeu este aviso porque criou um alerta de preço. <a href="${escapeHtml(input.contaUrl)}" style="color:#5b5ce2">Alterar ou remover</a>.</p>
</div></body></html>`;

  return { to: input.to, subject: `O preço de ${input.productName} chegou a ${price}`, text, html };
}
