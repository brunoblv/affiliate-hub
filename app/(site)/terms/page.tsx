export const metadata = { title: "Termos de Uso — Meu Novo Lar" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Termos de Uso</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Última atualização: {new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long" })}.
        Estes termos explicam, em linguagem simples, as regras de uso do site Meu Novo Lar. Ao usar o
        site, você concorda com elas.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">O que é o site</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        O Meu Novo Lar publica conteúdo editorial, comparações de produtos, ofertas e ferramentas
        gratuitas relacionadas à casa. Não somos uma loja: não vendemos, entregamos ou processamos
        pagamentos de nenhum produto listado aqui.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Links de afiliado</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Boa parte dos links de produtos são links de afiliado. Ao clicar e comprar em uma loja
        parceira (Mercado Livre, Shopee, Amazon, Magalu, entre outras), podemos receber uma comissão,
        sem custo adicional pra você. A compra em si é feita direto com a loja, sob os termos e
        políticas dela — não temos controle sobre preço, estoque, entrega ou atendimento pós-venda.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Preços e informações de produtos</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Preços, descontos e disponibilidade mudam constantemente nas lojas parceiras. Fazemos o
        possível pra manter tudo atualizado, mas não garantimos que o valor exibido aqui seja sempre
        idêntico ao da loja no momento da sua compra. Confirme sempre o preço final na página do
        produto antes de finalizar.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Uso permitido</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Você pode navegar, ler e compartilhar nosso conteúdo livremente, desde que credite a fonte com
        um link para a página original. Não é permitido copiar o conteúdo do site (textos, imagens,
        ferramentas) e republicar como se fosse seu, nem usar meios automatizados para extrair dados do
        site em grande volume sem autorização.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Ferramentas do site</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        As calculadoras e ferramentas disponíveis são fornecidas "como estão", para fins informativos.
        Os resultados são estimativas — sempre confira medidas e quantidades antes de fazer uma compra
        ou projeto que dependa delas.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Alterações</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Podemos atualizar estes termos de tempos em tempos. Mudanças relevantes serão refletidas nesta
        página com a data de atualização revisada.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Dúvidas</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Qualquer dúvida sobre estes termos, fale com a gente pela{" "}
        <a href="/contato" className="font-semibold text-primary hover:underline">
          página de contato
        </a>
        .
      </p>
    </div>
  );
}
