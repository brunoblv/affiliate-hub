export const metadata = { title: "Contato — Meu Novo Lar" };

export default function ContatoPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Fale com a gente</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Dúvida sobre um conteúdo, sugestão de pauta, erro no site ou proposta de parceria — pode
        mandar. Respondemos o mais rápido que conseguirmos, geralmente em até 2 dias úteis.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-6">
          <div className="text-[11px] font-bold tracking-[0.09em] text-muted-foreground">E-MAIL</div>
          <a
            href="mailto:contato@meunovolar.com"
            className="mt-1.5 block text-lg font-semibold text-foreground hover:text-primary hover:underline"
          >
            contato@meunovolar.com
          </a>
        </div>

        <div className="rounded-xl border border-border p-6">
          <div className="text-[11px] font-bold tracking-[0.09em] text-muted-foreground">INSTAGRAM</div>
          <a
            href="https://www.instagram.com/brunomeunovolar/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 block text-lg font-semibold text-foreground hover:text-primary hover:underline"
          >
            @brunomeunovolar
          </a>
        </div>
      </div>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Antes de escrever</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li>Reportando um preço ou link quebrado? Manda a URL da página e do produto, ajuda bastante.</li>
        <li>Proposta de parceria ou publicidade? Conta um pouco sobre a marca e o que você tem em mente.</li>
        <li>Dúvida sobre um pedido feito numa loja parceira? Esse contato precisa ser feito direto com a loja — não temos acesso aos seus pedidos.</li>
      </ul>
    </div>
  );
}
