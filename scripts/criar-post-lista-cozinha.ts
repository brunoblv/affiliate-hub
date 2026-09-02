/**
 * Cria o rascunho da lista "Itens essenciais na cozinha" com CTA único
 * para https://meli.la/1bxTwCn. Idempotente pelo título.
 *
 *   npx tsx scripts/criar-post-lista-cozinha.ts
 *
 * Para rodar contra produção, exportar DATABASE_URL=$PROD_DATABASE_URL antes.
 */
import "dotenv/config";
import { prisma, StatusPost, TipoPost, CategoriaEditorial, Destino } from "@/lib/database";
import { slugDePostLivre } from "@/lib/conteudo/slug";
import { resumoAutomatico } from "@/lib/conteudo/corpo";

const TITULO = "Itens essenciais na cozinha: o que realmente faz diferença no dia a dia";
const LISTA_AFILIADO = "https://meli.la/1bxTwCn";

const RESUMO =
  "Cortar, organizar a geladeira e guardar comida sem bagunça. Kit prático de cozinha — a lista completa está no Mercado Livre.";

const SEO_TITULO = "Itens essenciais na cozinha: kit prático do dia a dia";
const META =
  "Utensílios pra cortar, organizar geladeira e gaveta e guardar comida. Veja o kit essencial e a lista completa no Mercado Livre.";

const CORPO = `Cozinha que funciona no dia a dia não é a que tem mais coisa na bancada. É a que corta, bate, guarda e encontra o que precisa sem virar bagunça. Esta lista junta o básico de preparo, organização de geladeira e gaveta, e o que segura comida pra semana.

Os 19 itens estão na mesma lista de afiliado do Mercado Livre. Se algum fizer sentido, você vê o conjunto inteiro num clique — sem cadastrar produto por produto aqui no site.

[cta:${LISTA_AFILIADO}]

## Preparar: cortar, bater e amassar

### Espremedor de batata inox

![Espremedor de batata inox](https://http2.mlstatic.com/D_Q_NP_2X_867056-MLA111352556812_052026-V.webp)

Amassador manual para purê, nhoque e aipim. Também serve em outros legumes cozidos, quando a ideia é textura uniforme sem ligar o processador.

### Tesoura multifuncional de cozinha

![Tesoura multifuncional de cozinha](https://http2.mlstatic.com/D_Q_NP_2X_781832-MLA115586546802_092026-V.webp)

Tesoura de inox para frango, osso e peixe. Corta embalagem, erva e carne ainda na tábua — menos ida até a faca quando a mão já está ocupada.

### Fuê / fouet 30 cm

![Fuê fouet 30 cm](https://http2.mlstatic.com/D_Q_NP_2X_689628-MLB84958828216_052025-V.webp)

Batedor de ovos no tamanho de quem faz molho, omelete ou massa no bowl. Os 30 cm dão alcance sem esbarrar o cabo na borda a cada volta.

### Cortador ralador de 5 peças

![Cortador ralador de 5 peças](https://http2.mlstatic.com/D_Q_NP_2X_691867-MLB112808578857_062026-V-cortador-ralador-fatiador-de-legumes-multifuncional-5-pecas.webp)

Conjunto para fatiar e ralar legumes. Vale quando o jantar pede palito, rodela ou ralado e você não quer uma máquina enorme na bancada.

### Ralador fatiador 3 em 1

![Ralador fatiador 3 em 1](https://http2.mlstatic.com/D_Q_NP_2X_807698-MLB71986842154_102023-V.webp)

Versão compacta para queijo, verdura e legumes no dia a dia. Cabe na gaveta e resolve o ralado rápido, sem montar o kit inteiro.

### Cortador 16 em 1

![Cortador 16 em 1](https://http2.mlstatic.com/D_Q_NP_2X_828065-MLB111156392496_052026-V.webp)

Cortador com vários acessórios de inox. Faz sentido se você já fatia bastante e quer trocar o disco em vez de empilhar três ferramentas diferentes.

### Kit 2 tábuas de bambu

![Kit 2 tábuas de bambu](https://http2.mlstatic.com/D_Q_NP_2X_887573-MLA114616699809_072026-V.webp)

Duas tábuas, 32×22 e 36×26 cm, com alça. Uma fica para carne, a outra para legumes — o mínimo pra não cruzar o que ainda vai ao fogo com o que já está pronto.

### Tábua de corte grande de inox

![Tábua de corte grande de inox](https://http2.mlstatic.com/D_Q_NP_2X_854046-MLA113099396577_062026-V.webp)

Tábua 80×51 cm para quem corta volume de uma vez (churrasco, marmita da semana). Ocupa espaço; só entra se a bancada aguentar.

[cta:${LISTA_AFILIADO}|Ver a lista no Mercado Livre]

## Organizar geladeira e gaveta

### Organizador giratório 360°

![Organizador giratório 360 graus](https://http2.mlstatic.com/D_Q_NP_2X_830909-MLB107123520974_022026-V.webp)

Bandeja que gira no fundo do armário ou da geladeira. O pote do fundo deixa de ficar invisível — você gira em vez de empilhar a mão até o fundo.

### Organizador giratório pequeno

![Organizador giratório pequeno transparente](https://http2.mlstatic.com/D_Q_NP_2X_917097-MLB115658187569_082026-V.webp)

O mesmo princípio, tamanho P. Serve em prateleira estreita, canto de geladeira ou armário de tempero, onde o modelo grande não cabe.

### Kit 6 organizadores de geladeira

![Kit 6 organizadores de geladeira](https://http2.mlstatic.com/D_Q_NP_2X_662110-MLA114543744263_072026-V.webp)

Cestos e potes para frutas, verduras e o que costuma se perder atrás de uma embalagem. É o item que mais muda a rotina: você vê o que tem antes de ir ao mercado.

### Kit 4 organizadores de gaveta

![Kit 4 organizadores de gaveta](https://http2.mlstatic.com/D_Q_NP_2X_762020-MLA96146249861_102025-V.webp)

Quatro caixas 30×15×5 cm. Separam pano, elástico, tampa e o miúdo que vira uma camada só no fundo da gaveta.

### Organizador de talheres com extensor

![Organizador de talheres com extensor](https://http2.mlstatic.com/D_Q_NP_2X_949998-MLB93049857349_092025-V-organizador-porta-talheres-gaveta-para-cozinha-com-extensor.webp)

Porta-talheres que estica até a largura da gaveta. Evita o vão morto nas laterais, comum em gaveta que não é o padrão da loja.

### Porta-talheres ajustável

![Porta-talheres ajustável preto](https://http2.mlstatic.com/D_Q_NP_2X_743010-MLB105945121986_022026-V.webp)

Divisórias que você empurra conforme o jogo de talheres. Melhor do que o modelo fixo quando a gaveta mistura colher de servir, faca e o jogo do dia a dia.

## Guardar e servir

### Kit 10 potes de vidro 640 ml

![Kit 10 potes de vidro 640 ml](https://http2.mlstatic.com/D_Q_NP_2X_900432-MLA113518359539_062026-V.webp)

Marmita hermética de 640 ml, tamanho de refeição. Vidro vai ao freezer e para de acumular aquele conjunto de pote sem tampa que ninguém casa.

### Kit 10 potes de vidro 370 ml

![Kit 10 potes de vidro 370 ml](https://http2.mlstatic.com/D_Q_NP_2X_605578-MLA113633610823_062026-V.webp)

O mesmo esquema, porção menor: sobra, molho, fruta picada. Combina com o kit de 640 ml — um para o almoço, outro para o que sobrou.

### Escorredor de silicone retrátil

![Escorredor de silicone retrátil](https://http2.mlstatic.com/D_Q_NP_2X_840831-MLA99621606878_122025-V.webp)

Escorre macarrão, legumes e fruta, com alça, e fecha pra caber na gaveta. Pia pequena agradece: não fica um escorredor de aço ocupando a cuba o dia inteiro.

### Kit para air fryer

![Kit para air fryer](https://http2.mlstatic.com/D_Q_NP_2X_927366-MLA115732005901_082026-V.webp)

Forma de silicone, tapete protetor e pegador. Serve se a fritadeira já está na rotina e você ainda assa direto no cesto — o tapete e a forma diminuem a faxina depois.

### Kit 10 utensílios de silicone

![Kit 10 utensílios de silicone](https://http2.mlstatic.com/D_Q_NP_2X_983249-MLA109706862726_042026-V.webp)

Espátula, concha, escumadeira e o jogo que não risca panela antiaderente. Um conjunto só, em vez de cinco cabo de pau misturados na mesma jarra.

Se eu tivesse que ficar com um, seria o kit de organizadores da geladeira. É onde a comida some atrás de uma embalagem e vira desperdício. Com cesto no lugar certo, você vê o que tem antes de comprar de novo.

Por onde começar: escolha uma gaveta ou a prateleira da geladeira que mais te irrita e resolva só aquilo. O resto da lista entra quando a rotina pedir, não de uma vez.

[cta:${LISTA_AFILIADO}]
`;

async function main() {
  const existente = await prisma.post.findFirst({
    where: { titulo: TITULO },
    select: { id: true, slug: true, status: true },
  });

  if (existente) {
    console.log(`Já existe (${existente.status}) — /admin/posts/${existente.id}`);
    return;
  }

  const post = await prisma.post.create({
    data: {
      tipo: TipoPost.LISTA,
      destino: Destino.MEU_NOVO_LAR,
      categoriaEditorial: CategoriaEditorial.DICAS_CASA,
      titulo: TITULO,
      slug: await slugDePostLivre(TITULO),
      resumo: RESUMO,
      corpo: CORPO,
      seoTitulo: SEO_TITULO,
      metaDescricao: META,
      status: StatusPost.RASCUNHO,
    },
    select: { id: true, slug: true },
  });

  console.log(`Rascunho criado — /admin/posts/${post.id}`);
  console.log(`Slug: ${post.slug}`);
  console.log(`Resumo automático (checagem): ${resumoAutomatico(CORPO)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
