import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com o Capibusca: dúvidas, correções de preço e pedidos sobre dados pessoais.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  return (
    <InstitutionalPage
      title="Contato"
      intro="Respondemos por e-mail. Para agilizar, diga do que se trata no assunto da mensagem."
    >
      <h2>Dúvidas, sugestões e correções</h2>
      <p>
        <strong>{info.contactEmail}</strong>
      </p>
      <p>
        Achou um preço errado ou um produto comparado com outro diferente? Envie o endereço da página do produto e o
        que está divergente. Lembre que pedidos, entregas, trocas e reembolsos são tratados diretamente pela loja onde
        você comprou.
      </p>

      <h2>Privacidade e dados pessoais (LGPD)</h2>
      <p>
        Encarregado pelo tratamento de dados: <strong>{info.dpoEmail}</strong>
      </p>
      <p>
        Para acessar, corrigir, levar ou apagar seus dados, escreva a partir do e-mail cadastrado. Muita coisa você
        resolve na hora em <Link href="/conta">Minha conta</Link>, inclusive excluir a conta. Respondemos em até 15
        dias. Veja a <Link href="/politica-de-privacidade">política de privacidade</Link>.
      </p>
    </InstitutionalPage>
  );
}
