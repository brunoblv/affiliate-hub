import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que é o Capibusca, que problema resolve e como se relaciona com as lojas.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <InstitutionalPage
      title={`Sobre o ${info.siteName}`}
      intro="Um comparador de preços que mostra, em um só lugar, quanto o mesmo produto custa em diferentes lojas — e se o preço de hoje é realmente bom."
    >
      <h2>Que problema resolvemos</h2>
      <p>
        O mesmo produto aparece com preços, fretes e vendedores diferentes em cada marketplace, e “promoções” nem
        sempre são mais baratas do que o normal. Juntamos as ofertas que monitoramos, organizamos por produto e
        variação e guardamos o histórico de preços para que você compare com contexto.
      </p>

      <h2>Como os preços são obtidos</h2>
      <p>
        Consultamos periodicamente as lojas parceiras, principalmente pelas interfaces oficiais dos programas de
        afiliados. Cada oferta mostra quando foi verificada pela última vez. Quando uma consulta falha, mantemos o
        último dado com sua data em vez de inventar um preço. Os detalhes estão em{" "}
        <Link href="/como-funciona">como funciona</Link>.
      </p>

      <h2>Relação com as lojas</h2>
      <p>
        Não somos uma loja e não vendemos nada. Participamos de programas de afiliados e podemos receber comissão
        quando você compra por um link nosso, sem custo extra para você e sem que isso altere a ordenação por preço.
        Leia a <Link href="/afiliados">divulgação de afiliados</Link>.
      </p>

      <h2>Quem está por trás</h2>
      <p>
        O {info.siteName} é operado por {info.operatorName}. Fale com a gente pela página de{" "}
        <Link href="/contato">contato</Link>.
      </p>
    </InstitutionalPage>
  );
}
