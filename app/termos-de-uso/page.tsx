import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do Capibusca, limites da comparação de preços e responsabilidades.",
  alternates: { canonical: "/termos-de-uso" },
};

export default function TermsPage() {
  return (
    <InstitutionalPage
      title="Termos de uso"
      updatedAt={info.policiesUpdatedAt}
      intro={
        <>
          Estes termos regem o uso do {info.siteName},.
          Ao usar o site você concorda com eles. Se não concordar, não use o serviço.
        </>
      }
    >
      <h2 id="servico">1. O que é o serviço</h2>
      <p>
        O {info.siteName} é um comparador de preços gratuito. Monitoramos ofertas publicadas por lojas e marketplaces
        parceiros, organizamos por produto e mostramos histórico e variações. <strong>Não vendemos produtos</strong>:
        a compra, o pagamento, a entrega, a troca e a garantia acontecem diretamente com a loja escolhida, nas
        condições dela.
      </p>

      <h2 id="precos">2. Preços e disponibilidade</h2>
      <ul>
        <li>
          Preços, frete, estoque e condições são coletados periodicamente e podem mudar na loja a qualquer momento.
          Cada oferta mostra quando foi verificada.
        </li>
        <li>O preço válido é sempre o exibido no site da loja no momento da compra.</li>
        <li>
          Nos esforçamos para comparar o mesmo produto e variação, mas pode haver erros de correspondência, de
          coleta ou na informação publicada pela loja. Confira modelo, versão e vendedor antes de comprar.
        </li>
        <li>
          Alertas de preço são enviados com base na última verificação e podem chegar com atraso ou não ser
          entregues por falha do e-mail ou do navegador. Não garantimos que a oferta ainda esteja disponível.
        </li>
      </ul>

      <h2 id="afiliados">3. Links de afiliado</h2>
      <p>
        Parte dos links leva à loja por programas de afiliados, e podemos receber comissão sobre compras. Isso não
        muda o preço que você paga nem a ordenação por preço. Detalhes em{" "}
        <Link href="/afiliados">divulgação de afiliados</Link>.
      </p>

      <h2 id="conta">4. Conta</h2>
      <p>
        A conta é opcional e serve para favoritos e alertas. O acesso é feito com uma conta Google; você é
        responsável por mantê-la segura. Você pode excluir sua conta a qualquer momento em{" "}
        <Link href="/conta">Minha conta</Link>. Podemos suspender contas usadas em desacordo com estes termos.
      </p>

      <h2 id="uso">5. Uso permitido</h2>
      <p>Não é permitido:</p>
      <ul>
        <li>coletar dados do site de forma automatizada (robôs, scrapers) sem autorização;</li>
        <li>sobrecarregar, testar vulnerabilidades ou tentar acessar áreas restritas;</li>
        <li>gerar cliques artificiais em links de afiliado ou convites de comunidades;</li>
        <li>usar o site para fins ilícitos ou que violem direitos de terceiros.</li>
      </ul>

      <h2 id="comunidades">6. Comunidades</h2>
      <p>
        Indicamos grupos e canais no WhatsApp e no Telegram. Ao entrar, você passa a seguir as regras e a política de
        privacidade dessas plataformas, e seu número ou perfil pode ficar visível a outros participantes conforme as
        configurações delas.
      </p>

      <h2 id="propriedade">7. Propriedade intelectual</h2>
      <p>
        Textos, análises, marca, layout e imagens próprias do {info.siteName} são protegidos. Nomes, marcas e
        imagens de produtos e lojas pertencem aos seus titulares e são usados apenas para identificação.
      </p>

      <h2 id="responsabilidade">8. Limitação de responsabilidade</h2>
      <p>
        O site é oferecido como está. Não respondemos por produtos, entregas, cobranças ou atendimento das lojas,
        nem por decisões de compra tomadas com base nas informações exibidas, ressalvados os direitos garantidos
        pelo Código de Defesa do Consumidor. Podemos alterar, suspender ou encerrar funcionalidades.
      </p>

      <h2 id="privacidade">9. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a <Link href="/politica-de-privacidade">política de privacidade</Link>{" "}
        e a <Link href="/politica-de-cookies">política de cookies</Link>.
      </p>

      <h2 id="alteracoes">10. Alterações e legislação</h2>
      <p>
        Estes termos podem ser atualizados; a data no topo indica a versão vigente. Aplicam-se as leis brasileiras.
        Fica eleito o foro do domicílio do consumidor para resolver eventuais conflitos.
      </p>

      <h2 id="contato">11. Contato</h2>
      <p>
        Dúvidas sobre estes termos: {info.contactEmail} ou <Link href="/contato">página de contato</Link>.
      </p>
    </InstitutionalPage>
  );
}
