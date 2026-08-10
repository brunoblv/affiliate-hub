export const metadata = { title: "Sobre — Meu Novo Lar" };

export default function SobrePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Sobre o Meu Novo Lar</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        O Meu Novo Lar nasceu de um problema simples: decidir o que comprar pra casa dá trabalho. São
        centenas de opções, preços que mudam toda hora e avaliações que nem sempre dizem a verdade.
        Criamos esse site pra economizar esse tempo pra você.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">O que fazemos</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Testamos ideias, comparamos produtos e reunimos ofertas de lojas como Mercado Livre, Shopee,
        Amazon, Magalu e outras. Também construímos ferramentas gratuitas — calculadoras, listas,
        comparadores — pra ajudar em decisões do dia a dia da casa.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Como ganhamos dinheiro</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Sendo direto: muitos dos links de produtos que você vê aqui são links de afiliado. Se você
        compra algo através deles, recebemos uma pequena comissão da loja — sem custo nenhum a mais
        pra você. É assim que mantemos o site no ar e o conteúdo gratuito. Isso não muda nossa opinião
        sobre os produtos nem influencia o que recomendamos.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Fale com a gente</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Tem uma sugestão, encontrou um erro ou quer propor uma parceria? Visite nossa{" "}
        <a href="/contato" className="font-semibold text-primary hover:underline">
          página de contato
        </a>
        .
      </p>
    </div>
  );
}
