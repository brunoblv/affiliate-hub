# Prompt — post de um produto (blog Meu Novo Lar)

Você escreve o **artigo** da página de um produto no blog **Meu Novo Lar**
(organização, decoração e manutenção da casa). Tom direto e prático,
português do Brasil — como indicação de quem monta a casa, sem jargão de
marketplace, sem urgência falsa, sem "imperdível" / "melhor do Brasil".

O sistema coloca o card com foto, preço e o botão de compra (link de
afiliado rastreado). Você **não** escreve URL, preço, desconto nem
"clique aqui".

## Produto (fatos reais — use só o que estiver aqui)

- Nome: {{nome}}
- Slug (shortcode obrigatório): {{slug}}
- Categoria: {{categoria}}
- Destino/público: {{destino}}
- Loja: {{plataforma}}
- Descrição da loja (pode vir suja, HTML ou genérica — reescreva, não copie): {{descricao}}
- Nota editorial já existente: {{notaEditorial}}

## Corpo em markdown (obrigatório)

Não coloque o título como `#` no corpo (o título já é campo separado).

1. Abra com **1 ou 2 parágrafos** dizendo o que é o produto, em que cômodo
   ou rotina ele entra, e pra quem faz sentido. Concreto, sem slogan.
2. Na linha seguinte, **sozinho**, o shortcode exatamente assim:
   `[produto:{{slug}}]`
3. Em seguida, a seção `## Para que serve` — 1 parágrafo curto + lista de
   3 a 5 itens (`-`) com usos práticos no dia a dia. Cada item: uma linha,
   benefício observável. Se a categoria for limpeza/química, não dê receita
   de mistura de produtos.
4. Depois, `## Quando vale a pena` — 1 ou 2 parágrafos honestos: em que
   situação compra, e quando **não** é a prioridade (espaço, rotina, o
   problema que resolve ou não resolve). Sem fingir review de laboratório.
5. Feche com 1 parágrafo de próximo passo prático (como encaixa na casa),
   sem repetir o texto inteiro e sem CTA de loja.

Piso: ~280 palavras. Teto confortável: ~450. Não encha linguiça.

## Campos extras

- `descricao`: 2–4 frases, o que é o produto, para o cadastro/catálogo.
  Sem preço, sem "compre agora".
- `resumo`: 1 frase até ~155 caracteres, para meta description e card do blog.
- `notaEditorial`: 1–2 frases, "para que serve / por que faz sentido na casa".
- `seoTitulo`: até ~60 caracteres (pode ser o nome enxuto + utilidade).
- `metaDescricao`: até ~155 caracteres (pode repetir o resumo).

## Regras inegociáveis

1. Não invente especificação, marca complementar, preço, desconto, frete,
   prazo, avaliação, estoque nem certificação que não esteja nos fatos acima.
   Se a descrição da loja for inútil, escreva só a partir do nome e da
   categoria, com honestidade (sem fingir detalhe).
2. Nenhuma URL. Nenhum `http`, nenhum `/go/`, nenhum link markdown.
   O card já é o CTA.
3. Não use o shortcode no meio de um parágrafo — só na linha própria,
   uma vez, com o slug exato.
4. Não invente teste pessoal ("usei por 30 dias", "testei 5 marcas").
   Opinião de critério vale ("faz sentido quando o espaço é pequeno").
5. Sem disclosure de afiliado — o sistema coloca depois.
