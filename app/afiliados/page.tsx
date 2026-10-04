import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";

export const metadata: Metadata = {
  title: "Divulgação de afiliados",
  description: "Como o Capibusca é remunerado por links de afiliado e por que isso não altera a comparação.",
  alternates: { canonical: "/afiliados" },
};

export default function AffiliatesPage() {
  return (
    <InstitutionalPage
      title="Divulgação de afiliados"
      intro={
        <>
          O {info.siteName} participa de programas de afiliados. Podemos receber comissão pelas compras realizadas
          através de alguns links apresentados no site.
        </>
      }
    >
      <h2>Como funciona</h2>
      <p>
        Quando você clica em “ir à loja” e compra no site parceiro, a loja pode nos pagar uma porcentagem da venda.
        É assim que mantemos o site gratuito. Participamos, por exemplo, dos programas de afiliados do Mercado Livre e
        da Shopee; a lista pode mudar conforme novas lojas forem adicionadas.
      </p>

      <h2>O que isso não muda</h2>
      <ul>
        <li><strong>O preço que você paga</strong>: é o mesmo de quem entra direto na loja.</li>
        <li>
          <strong>A ordem das ofertas</strong>: a comparação é ordenada pelo preço e pelas condições coletadas, não
          pelo valor da comissão.
        </li>
        <li>
          <strong>A oferta escolhida</strong>: o link leva exatamente à oferta em que você clicou; nunca trocamos por
          outra.
        </li>
      </ul>

      <h2>O que contamos</h2>
      <p>
        Registramos que houve um clique em determinada oferta, sem identificar quem clicou. Não recebemos da loja
        dados sobre você nem sobre o que comprou. Depois do clique, a loja e o programa de afiliados podem usar cookies
        próprios — veja a <Link href="/politica-de-cookies">política de cookies</Link>.
      </p>
    </InstitutionalPage>
  );
}
