export const metadata = { title: "Política de Privacidade — Meu Novo Lar" };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Política de Privacidade</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Última atualização: {new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long" })}.
        Aqui explicamos, sem juridiquês, quais dados coletamos no Meu Novo Lar e o que fazemos com eles.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Quais dados coletamos</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">Coletamos poucas coisas, e só o necessário:</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li><span className="font-medium text-foreground">E-mail</span>, se você se inscreve na nossa newsletter.</li>
        <li><span className="font-medium text-foreground">Dados de navegação</span> (páginas visitadas, dispositivo, origem do acesso) através de cookies e ferramentas de analytics, para entender o que funciona no site.</li>
        <li><span className="font-medium text-foreground">Cliques em links de afiliado</span>, para saber quais produtos e ofertas fazem sentido continuar mostrando.</li>
        <li>Se você entra em contato por e-mail, guardamos essa conversa para conseguir te responder.</li>
      </ul>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Não pedimos CPF, dados de cartão ou informações de pagamento — nenhuma compra é feita dentro do
        nosso site.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Cookies</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Usamos cookies próprios e de terceiros (analytics, Google AdSense quando os anúncios
        estiverem no ar, e as lojas parceiras via links de afiliado) para lembrar preferências, medir
        audiência, veicular publicidade e saber quando uma compra veio através de um dos nossos links.
        No primeiro acesso mostramos um aviso de cookies: você pode aceitar ou recusar os não
        essenciais. Também é possível bloquear cookies nas configurações do navegador — o site
        continua funcionando, mas analytics e anúncios personalizados ficam limitados.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Com quem compartilhamos</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Não vendemos seus dados. Compartilhamos informações apenas com: (1) provedores de analytics e
        e-mail que nos ajudam a operar o site, sob contrato de confidencialidade; (2) as redes de
        afiliados e lojas parceiras, na medida necessária para registrar que uma venda veio pelo nosso
        link — elas não recebem seu e-mail de newsletter nem seu histórico de navegação no nosso site;
        e (3) o Google, se você aceitar cookies de analytics ou de anúncios (Analytics e AdSense).
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Seus direitos</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Você pode pedir a qualquer momento para ver quais dados temos sobre você, corrigi-los ou
        excluí-los — inclusive sair da newsletter, com um clique no link de descadastro presente em
        todo e-mail que enviamos. Para qualquer um desses pedidos, é só chamar na{" "}
        <a href="/contato" className="font-semibold text-primary hover:underline">
          página de contato
        </a>
        .
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Segurança</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Tomamos cuidados razoáveis para proteger os dados que coletamos, mas nenhum site é 100%
        imune a falhas — se identificarmos algum incidente que afete seus dados, vamos te avisar.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Anúncios (Google AdSense)</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        O site pode exibir anúncios do Google AdSense. O Google usa cookies para veicular e medir
        publicidade, inclusive com base em visitas anteriores a este e a outros sites. Você pode
        recusar cookies não essenciais no aviso que aparece na primeira visita, ou gerenciar anúncios
        personalizados em{" "}
        <a
          href="https://www.google.com/settings/ads"
          rel="noopener noreferrer"
          target="_blank"
          className="font-semibold text-primary hover:underline"
        >
          configurações de anúncios do Google
        </a>
        . A política de cookies e parceiros do Google está em{" "}
        <a
          href="https://policies.google.com/technologies/ads?hl=pt-BR"
          rel="noopener noreferrer"
          target="_blank"
          className="font-semibold text-primary hover:underline"
        >
          policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Alterações nesta política</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Podemos atualizar este texto conforme o site evolui. A data no topo da página sempre mostra a
        versão mais recente.
      </p>
    </div>
  );
}
