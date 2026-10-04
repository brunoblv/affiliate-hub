import Link from "next/link";

/**
 * Guias de compra (§19 do documento AdSense). Conteúdo editorial próprio, com data
 * de publicação/revisão; descreve só o que o site realmente faz. Ao mudar regra de
 * histórico, alerta ou oferta, revise o guia correspondente e atualize `updatedAt`.
 */
export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** AAAA-MM-DD */
  publishedAt: string;
  updatedAt: string;
  author: string;
  readingMinutes: number;
  Body: () => React.ReactNode;
}

const AUTHOR = "Equipe Capibusca";

export const guides: Guide[] = [
  {
    slug: "como-saber-se-uma-promocao-e-boa",
    title: "Como saber se uma promoção é realmente boa",
    description:
      "Preço riscado e selo de desconto não provam economia. Veja como usar o histórico para conferir se a oferta é mesmo boa.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 5,
    Body: () => (
      <>
        <p>
          “De R$ 499 por R$ 299” parece um ótimo negócio, mas o preço de referência é definido pela própria loja. Ele
          pode ser um valor que quase nunca foi praticado. A única forma de saber se a promoção é boa é comparar com o
          que o produto realmente custou nas semanas anteriores.
        </p>

        <h2>1. Ignore o preço riscado e olhe o histórico</h2>
        <p>
          Na página de cada produto, o gráfico de histórico mostra os preços que nós mesmos observamos, dia a dia.
          Se o “preço de antes” da loja nunca aparece no gráfico, o desconto anunciado é maior do que o desconto real.
          Veja <Link href="/guias/como-interpretar-o-historico-de-precos">como interpretar o histórico</Link>.
        </p>

        <h2>2. Compare com a média, não com o pico</h2>
        <p>
          Uma queda em relação ao preço mais alto do período quase sempre existe. O que importa é a posição em relação
          à média. No quadro “O preço está bom?”, indicamos se o preço atual está abaixo, próximo ou acima da média dos
          dias observados. Consideramos “baixo” quando fica mais de 10% abaixo da média e “alto” quando fica mais de
          10% acima.
        </p>

        <h2>3. Desconfie de alta antes da data promocional</h2>
        <p>
          Um padrão comum é o preço subir alguns dias antes de uma data como a Black Friday e “cair” para o valor que
          já era praticado. No gráfico, isso aparece como um degrau para cima seguido de uma volta ao patamar anterior.
          Use o período de 90 dias ou 6 meses para enxergar esse movimento.
        </p>

        <h2>4. Compare o mesmo produto em várias lojas</h2>
        <p>
          Às vezes o produto está “em promoção” em uma loja e mais barato, sem selo nenhum, em outra. A lista de
          ofertas da página do produto já vem ordenada por preço, com frete e condição (novo ou usado).
        </p>

        <h2>5. Confira as condições da oferta</h2>
        <ul>
          <li>O preço é à vista no Pix ou parcelado? Veja <Link href="/guias/pix-ou-parcelado">Pix ou parcelado</Link>.</li>
          <li>O frete está incluído? Uma oferta R$ 20 mais barata com R$ 30 de frete sai mais cara.</li>
          <li>Quem vende? Em marketplaces, o vendedor faz diferença. Veja <Link href="/guias/como-comparar-vendedores">como comparar vendedores</Link>.</li>
          <li>É a mesma variação (cor, capacidade, voltagem) do produto que você quer?</li>
        </ul>

        <h2>Quando não dá para saber</h2>
        <p>
          Se o produto entrou há pouco tempo no nosso monitoramento, mostramos que o histórico ainda está em formação
          em vez de chutar uma avaliação. Nesse caso, crie um <Link href="/guias/como-criar-alertas-de-preco">alerta de
          preço</Link> e deixe o histórico trabalhar por você.
        </p>
      </>
    ),
  },
  {
    slug: "como-interpretar-o-historico-de-precos",
    title: "Como interpretar o histórico de preços",
    description:
      "O que o gráfico de histórico mostra, como a média é calculada e por que às vezes não damos uma avaliação do preço.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 5,
    Body: () => (
      <>
        <p>
          O histórico de preços é a memória do comparador: cada vez que verificamos uma oferta, o preço encontrado é
          guardado com data e hora. É ele que permite dizer se o preço de hoje é bom ou só parece bom.
        </p>

        <h2>De onde vêm os pontos do gráfico</h2>
        <p>
          Uma rotina automática consulta as lojas parceiras diariamente. O gráfico mostra o preço da variação e da
          condição selecionadas na página — por exemplo, “128 GB, preto, novo”. Variações diferentes têm históricos
          separados, porque costumam ter preços diferentes.
        </p>

        <h2>Os períodos</h2>
        <p>
          Você pode ver 30 dias, 90 dias, 6 meses ou 1 ano. Períodos curtos mostram a tendência recente; períodos
          longos revelam padrões sazonais, como altas antes de datas promocionais.
        </p>

        <h2>Como calculamos a média</h2>
        <ul>
          <li>Usamos um preço por dia observado: se a oferta foi verificada várias vezes no mesmo dia, vale a última verificação.</li>
          <li>
            Dias sem coleta <strong>não</strong> são preenchidos nem estimados. A média considera somente os dias em que
            o preço foi realmente observado.
          </li>
          <li>Os dias seguem o horário de Brasília.</li>
        </ul>
        <p>
          Assim, uma loja verificada mais vezes não pesa mais na média, e uma falha de coleta não vira um preço
          inventado.
        </p>

        <h2>“O preço está bom?”</h2>
        <p>Abaixo do gráfico, comparamos o preço atual com a média do período escolhido:</p>
        <ul>
          <li><strong>Baixo</strong>: mais de 10% abaixo da média.</li>
          <li><strong>Próximo da média</strong>: até 10% para cima ou para baixo.</li>
          <li><strong>Alto</strong>: mais de 10% acima da média.</li>
        </ul>
        <p>
          Só fazemos essa avaliação quando há pelo menos sete dias com coleta, espalhados por no mínimo uma semana, e
          quando o preço atual foi verificado recentemente. Sem isso, informamos quantos dias já foram observados e
          deixamos a avaliação para depois. É melhor não dizer nada do que afirmar que um preço é bom com base em dois
          dias de dados.
        </p>

        <h2>Alterações recentes</h2>
        <p>
          A lista de alterações mostra quando o preço mudou e em quantos por cento. Ela ajuda a perceber movimentos
          rápidos, como uma queda de um dia só, que no gráfico de um ano parecem um detalhe.
        </p>

        <h2>Limites do histórico</h2>
        <ul>
          <li>Ele mostra o que observamos, não todas as mudanças que a loja fez entre duas verificações.</li>
          <li>Promoções relâmpago de poucas horas podem não aparecer.</li>
          <li>Cupons, cashback e descontos de fidelidade aplicados no carrinho não entram no preço coletado.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "pix-ou-parcelado",
    title: "Pix ou parcelado: como comparar o preço real",
    description:
      "Desconto no Pix, parcelas “sem juros” e preço a prazo. Saiba comparar ofertas com formas de pagamento diferentes.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 4,
    Body: () => (
      <>
        <p>
          Muitas lojas anunciam dois preços: um menor para pagamento à vista (geralmente no Pix) e outro maior para
          parcelar no cartão. Comparar uma oferta à vista com outra parcelada sem perceber a diferença leva a
          conclusões erradas.
        </p>

        <h2>Como mostramos as formas de pagamento</h2>
        <ul>
          <li>O preço em destaque na lista de ofertas é o preço à vista coletado.</li>
          <li>
            Quando a loja informa uma condição para esse preço (por exemplo, “no Pix”), ela aparece logo abaixo do
            valor.
          </li>
          <li>
            Quando há parcelamento, mostramos “ou N× de R$ X”, calculado sobre o total a prazo informado pela loja —
            que pode ser maior que o preço à vista.
          </li>
        </ul>

        <h2>Parcelado “sem juros” nem sempre é sem custo</h2>
        <p>
          Se o à vista no Pix é R$ 900 e o parcelado é 10× de R$ 100, o total a prazo é R$ 1.000. As parcelas não têm
          juros sobre o preço a prazo, mas você paga R$ 100 a mais do que pagaria à vista — cerca de 11% a mais.
        </p>

        <h2>Quando parcelar pode valer a pena</h2>
        <p>
          Se o preço parcelado for igual ao à vista, parcelar sem juros mantém o dinheiro com você por mais tempo, o
          que pode ser vantajoso. Se houver diferença, compare o desconto do Pix com o que você ganharia mantendo o
          dinheiro aplicado durante as parcelas. Para descontos à vista acima de alguns pontos percentuais, o Pix
          costuma sair na frente.
        </p>

        <h2>Alertas e forma de pagamento</h2>
        <p>
          Ao criar um alerta, ele fica vinculado à opção selecionada na página, incluindo a condição de pagamento.
          Assim, um alerta para o preço no Pix não dispara por causa de um preço de outra condição.
        </p>

        <h2>Resumo</h2>
        <ul>
          <li>Compare sempre à vista com à vista e total a prazo com total a prazo.</li>
          <li>Some o frete antes de comparar.</li>
          <li>Confirme o preço final no carrinho da loja: é ele que vale.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "como-funcionam-precos-em-marketplaces",
    title: "Como funcionam os preços em marketplaces",
    description:
      "Por que o mesmo produto tem preços tão diferentes no Mercado Livre, na Shopee e em outras lojas — e por que eles mudam tanto.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 5,
    Body: () => (
      <>
        <p>
          Marketplaces como Mercado Livre e Shopee não são uma única loja: são plataformas onde muitos vendedores
          anunciam o mesmo produto. Isso explica boa parte das diferenças e das mudanças de preço que você vê.
        </p>

        <h2>Muitos vendedores, muitos preços</h2>
        <p>
          Cada vendedor define o próprio preço, frete e prazo. Um mesmo celular pode aparecer em dezenas de anúncios
          com valores diferentes. Por isso, além do preço, mostramos quem vende cada oferta.
        </p>

        <h2>Por que o preço muda tanto</h2>
        <ul>
          <li><strong>Precificação automática</strong>: vendedores usam ferramentas que ajustam o preço de acordo com a concorrência.</li>
          <li><strong>Campanhas da plataforma</strong>: datas promocionais, cupons e subsídios do próprio marketplace.</li>
          <li><strong>Estoque</strong>: quando o estoque acaba, a próxima oferta disponível costuma ser mais cara.</li>
          <li><strong>Frete</strong>: o valor e a gratuidade mudam conforme a região, o peso e programas de fidelidade.</li>
        </ul>

        <h2>O preço que você vê pode depender de você</h2>
        <p>
          Cupons, cashback, descontos para assinantes e o frete para o seu CEP só aparecem no carrinho. Nosso preço é o
          preço público do anúncio no momento da verificação, por isso sempre indicamos há quanto tempo cada oferta foi
          verificada. O preço final é o do site da loja.
        </p>

        <h2>Mesmo produto, anúncios diferentes</h2>
        <p>
          Lojas descrevem o mesmo produto de formas diferentes. Agrupamos as ofertas pelo produto e pela variação
          usando marca, modelo e identificadores, e as correspondências sugeridas automaticamente são conferidas
          antes de aparecer no site. Ainda assim, confira modelo e versão no anúncio antes de comprar.
        </p>

        <h2>O que fazer com isso</h2>
        <ul>
          <li>Compare várias ofertas, não só a primeira que aparece.</li>
          <li>Use o histórico para separar oscilação normal de promoção de verdade.</li>
          <li>Crie um alerta e espere: em marketplaces, o preço costuma voltar a cair.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "como-comparar-vendedores",
    title: "Como comparar vendedores antes de comprar",
    description:
      "O mais barato nem sempre é a melhor compra. O que conferir no vendedor, na condição do produto e no frete.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 4,
    Body: () => (
      <>
        <p>
          Em marketplaces, quem vende importa tanto quanto o preço. Uma diferença de poucos reais pode não compensar
          uma entrega demorada, um produto de condição diferente ou um atendimento ruim.
        </p>

        <h2>O que mostramos em cada oferta</h2>
        <ul>
          <li><strong>Vendedor</strong>: o nome de quem vende o anúncio.</li>
          <li><strong>Condição</strong>: novo ou usado.</li>
          <li><strong>Frete</strong>: grátis, pago ou não informado pela loja.</li>
          <li><strong>Última verificação</strong>: ofertas com coleta antiga são sinalizadas.</li>
        </ul>

        <h2>O que conferir no site da loja</h2>
        <ul>
          <li><strong>Reputação</strong>: avaliações de outros compradores, quantidade de vendas e reclamações recentes.</li>
          <li><strong>Loja oficial</strong>: muitas marcas têm loja oficial dentro do marketplace.</li>
          <li><strong>Garantia e nota fiscal</strong>: produtos com nota fiscal e garantia do fabricante evitam dor de cabeça.</li>
          <li><strong>Origem e prazo</strong>: produtos enviados do exterior podem ter prazo maior e tributos na entrega.</li>
          <li><strong>Política de devolução</strong>: confira o prazo e quem paga o frete de volta.</li>
        </ul>

        <h2>Sinais de alerta</h2>
        <ul>
          <li>Preço muito abaixo de todas as outras ofertas e do histórico.</li>
          <li>Vendedor sem avaliações ou criado há pouco tempo.</li>
          <li>Pedido para pagar ou conversar fora da plataforma — nunca faça isso.</li>
          <li>Descrição vaga, sem modelo exato ou com fotos genéricas.</li>
        </ul>

        <h2>Produtos usados</h2>
        <p>
          Comparamos novos e usados separadamente, inclusive no histórico e nos alertas, para que um preço de usado
          não pareça uma promoção do novo. Se optar por um usado, confira estado de conservação, bateria (em
          eletrônicos) e garantia oferecida.
        </p>
      </>
    ),
  },
  {
    slug: "como-criar-alertas-de-preco",
    title: "Como criar alertas de preço",
    description:
      "Defina o preço que você quer pagar e receba um aviso por e-mail ou no navegador quando a oferta chegar lá.",
    publishedAt: "2026-10-04",
    updatedAt: "2026-10-04",
    author: AUTHOR,
    readingMinutes: 3,
    Body: () => (
      <>
        <p>
          Em vez de entrar todo dia para ver se o preço caiu, crie um alerta: avisamos quando a oferta atingir o
          valor que você definiu.
        </p>

        <h2>Passo a passo</h2>
        <ol className="list-decimal pl-5">
          <li>Entre com sua conta Google.</li>
          <li>Abra a página do produto e escolha a variação (cor, capacidade etc.) e a condição (novo ou usado).</li>
          <li>No quadro de alerta, digite o preço desejado. Ele precisa ser menor que o preço atual daquela opção.</li>
          <li>Clique em “Criar alerta de preço”.</li>
        </ol>

        <h2>Como você é avisado</h2>
        <ul>
          <li><strong>E-mail</strong>: enviado para o endereço da sua conta Google.</li>
          <li>
            <strong>Notificação no navegador</strong>: opcional. Ative em <Link href="/conta">Minha conta</Link> e
            autorize as notificações quando o navegador pedir. Vale para cada dispositivo onde você ativar.
          </li>
        </ul>

        <h2>Quando o alerta dispara</h2>
        <p>
          A cada verificação de preço, conferimos se alguma oferta da opção escolhida está no valor desejado ou
          abaixo. Você recebe um aviso por vez que o preço atinge a meta. Se o preço voltar a subir, o alerta é
          rearmado e pode avisar de novo na próxima queda.
        </p>

        <h2>Dicas para escolher o preço-alvo</h2>
        <ul>
          <li>Use o histórico: o menor preço observado no período é uma referência realista.</li>
          <li>Metas muito abaixo do menor preço histórico podem nunca ser atingidas.</li>
          <li>Ao receber o aviso, confira rápido: preços em marketplaces mudam a qualquer momento.</li>
        </ul>

        <h2>Gerenciar e cancelar</h2>
        <p>
          Em <Link href="/conta">Minha conta</Link> você vê todos os alertas, altera metas, remove alertas e desativa
          as notificações. Se um envio falhar, o alerta fica pausado e pode ser reativado ali mesmo.
        </p>
      </>
    ),
  },
];

export function findGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export function formatGuideDate(iso: string): string {
  return new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
