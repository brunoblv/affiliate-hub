import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Coleta de preços, correspondência de produtos, comparação, histórico e alertas no Capibusca.",
  alternates: { canonical: "/como-funciona" },
};

export default function HowItWorksPage() {
  return (
    <InstitutionalPage
      title="Como funciona"
      intro="Do momento em que um preço é coletado até o aviso no seu e-mail, este é o caminho de cada oferta."
    >
      <h2>1. Coleta de preços</h2>
      <p>
        Uma rotina automática consulta as lojas parceiras todos os dias, além de atualizações pontuais. Guardamos
        preço, frete, condição (novo ou usado), vendedor e o horário da verificação. Variações bruscas
        demais vão para revisão antes de aparecer no site, para evitar exibir erro de coleta como promoção.
      </p>

      <h2>2. Correspondência de produtos</h2>
      <p>
        Lojas descrevem o mesmo produto de jeitos diferentes. Agrupamos as ofertas pelo produto e pela variação
        (cor, capacidade, voltagem etc.), usando marca, modelo e identificadores. Sugestões automáticas de
        correspondência são conferidas antes de publicar.
      </p>

      <h2>3. Comparação entre lojas</h2>
      <p>
        Na página do produto, as ofertas ativas aparecem ordenadas por preço, com frete e condição informados. Ofertas
        sem verificação recente são sinalizadas. A comissão de afiliado não influencia essa ordem.
      </p>

      <h2>4. Histórico e variações</h2>
      <p>
        Cada verificação vira um ponto no histórico. Com ele mostramos o menor preço observado, a média do período e
        se o preço atual está acima ou abaixo do habitual. Só exibimos essas análises quando há dados suficientes.
      </p>

      <h2>5. Alertas de preço</h2>
      <p>
        Com uma conta, você define um preço-alvo para um produto. Quando uma verificação encontra a oferta nesse valor
        ou abaixo, enviamos um aviso por e-mail e, se você ativou, por notificação no navegador. Gerencie seus alertas
        em <Link href="/conta">Minha conta</Link>.
      </p>

      <h2>6. Conteúdo dos produtos</h2>
      <p>
        Textos de apoio podem ser redigidos com ajuda de inteligência artificial a partir das especificações do
        produto e revisados pela equipe. Eles nunca trazem preço fixo nem inventam popularidade.
      </p>
    </InstitutionalPage>
  );
}
