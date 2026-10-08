import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";
import { adsConfig } from "@/lib/adsense/config";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados pessoais o Capibusca trata, por quê, com quem compartilha e como exercer seus direitos pela LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default function PrivacyPolicyPage() {
  return (
    <InstitutionalPage
      title="Política de privacidade"
      updatedAt={info.policiesUpdatedAt}
      intro={
        <>
          Esta política explica como o {info.siteName} trata dados pessoais, nos termos da Lei Geral de
          Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Você pode pesquisar e comparar preços sem
          criar conta; só pedimos dados quando você usa favoritos, alertas ou notificações.
        </>
      }
    >
      <h2 id="controlador">1. Quem é o controlador</h2>
      <p>
        O controlador dos dados pessoais tratados neste site é o responsável pelo {info.siteName}, que atende
        pelos canais abaixo.
      </p>
      <p>
        <strong>Encarregado pelo tratamento de dados (DPO):</strong> {info.dpoEmail}. É o canal para dúvidas sobre
        esta política e para pedidos relativos aos seus direitos.
      </p>

      <h2 id="dados">2. Quais dados tratamos, para quê e com qual base legal</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Situação</th>
              <th>Dados</th>
              <th>Finalidade</th>
              <th>Base legal (LGPD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Entrar com o Google</td>
              <td>Nome, e-mail verificado, foto do perfil, identificador da conta Google e tokens de autenticação</td>
              <td>Criar e manter sua conta e identificar você nas sessões</td>
              <td>Execução de contrato (art. 7º, V)</td>
            </tr>
            <tr>
              <td>Favoritos e alertas de preço</td>
              <td>Produtos salvos, preço no momento em que salvou, preço-alvo, condição do item e histórico de envio dos avisos</td>
              <td>Guardar sua lista e avisar quando o preço atingir a meta</td>
              <td>Execução de contrato (art. 7º, V)</td>
            </tr>
            <tr>
              <td>Aviso por e-mail</td>
              <td>Seu e-mail e os dados do alerta</td>
              <td>Enviar o aviso de preço que você pediu</td>
              <td>Execução de contrato (art. 7º, V)</td>
            </tr>
            <tr>
              <td>Notificações no navegador (push)</td>
              <td>Endereço de inscrição gerado pelo navegador e chaves de criptografia da inscrição</td>
              <td>Entregar avisos de preço no dispositivo em que você ativou</td>
              <td>Consentimento (art. 7º, I), dado pela permissão do navegador e revogável a qualquer momento</td>
            </tr>
            <tr>
              <td>Registros de acesso</td>
              <td>Endereço IP, data e hora de acesso</td>
              <td>Segurança da aplicação e cumprimento do art. 15 do Marco Civil da Internet</td>
              <td>Obrigação legal (art. 7º, II)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Estatísticas de uso sem identificação</h3>
      <p>
        Contamos buscas, termos pesquisados, visualizações de produtos e cliques em ofertas e convites de
        comunidades para entender o que é útil e melhorar o catálogo. Esses registros <strong>não</strong> guardam
        IP, cookie, navegador, identificador de usuário ou conta. Termos de busca que parecem conter e-mail,
        endereço web ou sequências longas de números (como telefone ou documento) são descartados e substituídos
        por “[termo omitido]”. Mesmo assim, evite digitar dados pessoais na busca.
      </p>

      <h3>O que não fazemos</h3>
      <ul>
        <li>Não vendemos nem alugamos dados pessoais.</li>
        <li>Não pedimos CPF, endereço, telefone ou dados de pagamento. A compra acontece sempre no site da loja.</li>
        <li>Não usamos seus dados pessoais para criar perfis de publicidade nem os enviamos a ferramentas de inteligência artificial.</li>
        <li>Não tomamos decisões automatizadas que afetem seus interesses (art. 20 da LGPD).</li>
      </ul>

      <h2 id="compartilhamento">3. Com quem compartilhamos</h2>
      <p>Compartilhamos dados apenas com quem precisamos para o site funcionar:</p>
      <ul>
        <li>
          <strong>Google</strong>: autenticação da sua conta (Google Sign-In) e entrega das fontes tipográficas do
          site (Google Fonts, que recebe o endereço IP de quem acessa a página).
        </li>
        <li>
          <strong>Provedores de hospedagem, banco de dados e envio de e-mail</strong>: armazenam os dados e entregam
          os avisos em nosso nome, como operadores, sem uso próprio.
        </li>
        <li>
          <strong>Serviços de push do seu navegador</strong> (por exemplo, Google, Mozilla, Apple ou Microsoft):
          transportam a notificação até o seu dispositivo, com conteúdo criptografado.
        </li>
        <li>
          <strong>Autoridades públicas</strong>: quando houver obrigação legal ou ordem judicial.
        </li>
      </ul>
      <p>
        Ao clicar em uma oferta, você é levado ao site da loja (por exemplo, Mercado Livre ou Shopee) por um link de
        afiliado. Não enviamos seus dados pessoais à loja; a partir daí, vale a política de privacidade dela. O mesmo
        vale ao entrar em uma comunidade no WhatsApp ou no Telegram. Veja{" "}
        <Link href="/afiliados">como funcionam os links de afiliado</Link>.
      </p>

      <h2 id="transferencia">4. Transferência internacional</h2>
      <p>
        Alguns fornecedores, como o Google e os serviços de push, podem processar dados em servidores fora do Brasil.
        Essas transferências ocorrem com base no art. 33 da LGPD, com fornecedores que adotam cláusulas contratuais e
        garantias de proteção compatíveis com a lei brasileira.
      </p>

      <h2 id="cookies">5. Cookies e armazenamento no navegador</h2>
      <p>
        Sem o seu consentimento, usamos apenas cookies necessários para login e segurança. Cookies de publicidade
        dependem de autorização (veja a seção 10). Os detalhes estão na <Link href="/politica-de-cookies">política de cookies</Link>.
      </p>

      <h2 id="retencao">6. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Conta, favoritos, alertas e inscrições de push</strong>: enquanto sua conta existir. Ao excluir a
          conta, tudo isso é apagado imediatamente da base de dados.
        </li>
        <li>
          <strong>Inscrição de push</strong>: removida quando você desativa as notificações ou quando o navegador
          informa que ela deixou de valer.
        </li>
        <li>
          <strong>Registros de acesso</strong>: 6 meses, como exige o Marco Civil da Internet.
        </li>
        <li>
          <strong>Cópias de segurança</strong>: podem manter dados excluídos por prazo limitado, até serem
          sobrescritas pela rotina de backup. Não são usadas para outra finalidade.
        </li>
        <li>
          <strong>Estatísticas sem identificação</strong>: podem ser mantidas por tempo indeterminado, pois não se
          referem a pessoas.
        </li>
      </ul>

      <h2 id="direitos">7. Seus direitos</h2>
      <p>Pelo art. 18 da LGPD, você pode, a qualquer momento e sem custo:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
        <li>pedir a portabilidade dos dados a outro fornecedor;</li>
        <li>pedir a eliminação dos dados tratados com base no seu consentimento;</li>
        <li>saber com quais entidades compartilhamos seus dados;</li>
        <li>ser informado sobre a possibilidade de não consentir e suas consequências;</li>
        <li>revogar o consentimento;</li>
        <li>opor-se a tratamento feito em desacordo com a lei.</li>
      </ul>
      <p>
        <strong>Como exercer:</strong> boa parte você faz sozinho em <Link href="/conta">Minha conta</Link> — ver
        seus dados, apagar favoritos e alertas, desativar notificações e excluir a conta definitivamente. Para os
        demais pedidos, escreva para <strong>{info.dpoEmail}</strong> a partir do e-mail cadastrado. Respondemos em
        até 15 dias. Podemos pedir uma confirmação de identidade antes de atender, para proteger sua conta.
      </p>
      <p>
        Se entender que seu pedido não foi atendido, você pode apresentar reclamação à Autoridade Nacional de Proteção
        de Dados (ANPD), em gov.br/anpd.
      </p>

      <h2 id="seguranca">8. Segurança</h2>
      <p>
        O site usa conexão criptografada (HTTPS), sessões assinadas, acesso administrativo restrito a contas
        autorizadas e chaves de serviço guardadas apenas no servidor. Nenhum sistema é totalmente imune a falhas; se
        ocorrer um incidente de segurança que possa causar risco ou dano relevante, comunicaremos você e a ANPD, como
        determina o art. 48 da LGPD.
      </p>

      <h2 id="criancas">9. Crianças e adolescentes</h2>
      <p>
        O site não é direcionado a crianças. A conta depende de uma conta Google e das regras de idade do Google.
        Se você é responsável por uma criança e acredita que ela nos forneceu dados, fale com o encarregado para que
        os dados sejam apagados.
      </p>

      <h2 id="publicidade">10. Publicidade (Google AdSense)</h2>
      <p>
        {adsConfig.enabled
          ? "Este site exibe anúncios do Google AdSense."
          : "Hoje o site não exibe anúncios. Quando passar a exibir anúncios do Google AdSense, valem as regras abaixo."}{" "}
        Os anúncios ficam fora das páginas de login, conta e administração, e nunca são misturados às ofertas.
      </p>
      <ul>
        <li>
          Fornecedores terceiros, incluindo o Google, usam cookies para exibir anúncios com base em visitas
          anteriores do usuário a este e a outros sites.
        </li>
        <li>
          O uso de cookies de publicidade permite ao Google e aos seus parceiros exibir anúncios com base nessas
          visitas.
        </li>
        <li>
          Você pode desativar a publicidade personalizada nas{" "}
          <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Configurações de anúncios do Google</a>{" "}
          e conhecer outras opções de desativação de fornecedores em{" "}
          <a href="https://www.aboutads.info/choices" rel="noopener noreferrer" target="_blank">aboutads.info</a>.
        </li>
        <li>
          Saiba como o Google usa os dados de sites parceiros em{" "}
          <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">
            policies.google.com/technologies/partner-sites
          </a>.
        </li>
      </ul>
      <p>
        Cookies de publicidade e medição só são ativados com o seu consentimento (art. 7º, I da LGPD), que poderá ser
        dado, recusado ou revogado no aviso de cookies do site. Sem consentimento, só podem ser exibidos anúncios não
        personalizados, que usam cookies apenas para limitar a frequência, medir e prevenir fraudes, conforme as
        regras do Google.
      </p>

      <h2 id="alteracoes">11. Alterações desta política</h2>
      <p>
        Podemos atualizar esta política para refletir mudanças no site ou na lei. A data no topo indica a última
        versão. Mudanças relevantes serão avisadas no site e, se você tiver conta, por e-mail.
      </p>

      <h2 id="contato">12. Contato</h2>
      <p>
        Encarregado: {info.dpoEmail}. Outros assuntos: veja a página de{" "}
        <Link href="/contato">contato</Link>.
      </p>
    </InstitutionalPage>
  );
}
