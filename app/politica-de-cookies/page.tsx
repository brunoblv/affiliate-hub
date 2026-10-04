import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { institutional as info } from "@/lib/institutional";
import { adsConfig } from "@/lib/adsense/config";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Quais cookies e armazenamentos de navegador o Capibusca usa e como controlá-los.",
  alternates: { canonical: "/politica-de-cookies" },
};

export default function CookiePolicyPage() {
  return (
    <InstitutionalPage
      title="Política de cookies"
      updatedAt={info.policiesUpdatedAt}
      intro={
        <>
          Cookies são pequenos arquivos que o site grava no seu navegador. Sem o seu consentimento, o {info.siteName} usa
          somente os necessários para o login funcionar com segurança. Cookies de publicidade só entram com a sua
          autorização.
        </>
      }
    >
      <h2 id="necessarios">1. Cookies que usamos</h2>
      <p>
        Todos são <strong>estritamente necessários</strong>: sem eles não é possível entrar na conta nem usar
        favoritos e alertas. Por isso não dependem de consentimento, mas você pode bloqueá-los no navegador (o login
        deixará de funcionar).
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Para que serve</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>authjs.session-token</td>
              <td>Mantém você conectado depois de entrar com o Google (sessão assinada, sem senha)</td>
              <td>Até 30 dias ou até você sair</td>
            </tr>
            <tr>
              <td>authjs.csrf-token</td>
              <td>Protege o login contra solicitações forjadas por outros sites</td>
              <td>Sessão do navegador</td>
            </tr>
            <tr>
              <td>authjs.callback-url</td>
              <td>Lembra para qual página voltar depois do login</td>
              <td>Sessão do navegador</td>
            </tr>
            <tr>
              <td>authjs.pkce.code_verifier, authjs.state</td>
              <td>Validam a resposta do Google durante o login</td>
              <td>Até 15 minutos</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted">
        Em conexão segura (HTTPS), os nomes recebem o prefixo <code>__Secure-</code> ou <code>__Host-</code>.
      </p>

      <h2 id="navegador">2. Outros recursos do navegador</h2>
      <ul>
        <li>
          <strong>Notificações push</strong>: se você ativar os avisos de preço no navegador, ele registra um
          service worker deste site e cria uma inscrição de notificações. Você pode desativar em{" "}
          <Link href="/conta">Minha conta</Link> ou nas configurações do navegador.
        </li>
        <li>
          <strong>Fontes</strong>: as fontes do site são carregadas dos servidores do Google Fonts, que recebem o
          endereço IP de quem acessa, conforme a política do Google. Não são gravados cookies nesse carregamento.
        </li>
      </ul>

      <h2 id="terceiros">3. Cookies de terceiros fora do site</h2>
      <p>
        Ao clicar em uma oferta, você vai para o site da loja por um link de afiliado. A loja e o programa de afiliados
        dela podem gravar cookies próprios para registrar que a visita veio daqui e calcular nossa comissão. Esses
        cookies são controlados pela loja, seguem a política dela e não são lidos pelo {info.siteName}. Saiba mais em{" "}
        <Link href="/afiliados">divulgação de afiliados</Link>.
      </p>

      <h2 id="publicidade">4. Publicidade (Google AdSense)</h2>
      <p>
        {adsConfig.enabled ? "Este site exibe anúncios do Google AdSense." : "Hoje o site não exibe anúncios."} Quando
        os anúncios estão ativos, o Google e seus parceiros podem gravar cookies (por exemplo, os de prefixo{" "}
        <code>__gads</code>, <code>__gpi</code> e <code>IDE</code>) para exibir anúncios com base em visitas anteriores
        a este e a outros sites, limitar a repetição de anúncios, medir resultados e prevenir fraudes.
      </p>
      <ul>
        <li>
          Esses cookies só são ativados depois do seu consentimento, coletado por um aviso no site que permite aceitar,
          recusar e mudar de ideia depois.
        </li>
        <li>
          Você pode desativar a publicidade personalizada nas{" "}
          <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Configurações de anúncios do Google</a>.
        </li>
        <li>
          Detalhes sobre os cookies do Google:{" "}
          <a href="https://policies.google.com/technologies/cookies" rel="noopener noreferrer" target="_blank">
            policies.google.com/technologies/cookies
          </a>.
        </li>
      </ul>

      <h2 id="controle">5. Como controlar</h2>
      <p>
        Todos os navegadores permitem ver, apagar e bloquear cookies nas configurações de privacidade. Apagar os
        cookies deste site encerra sua sessão; seus favoritos e alertas continuam salvos na conta.
      </p>
      <p>
        Mais sobre o tratamento de dados na <Link href="/politica-de-privacidade">política de privacidade</Link>.
      </p>
    </InstitutionalPage>
  );
}
