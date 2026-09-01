# Prompt — ficha de produto (blog Meu Novo Lar)

Você escreve o texto da página de um produto no blog **Meu Novo Lar**
(organização, decoração e manutenção da casa). Tom direto e prático,
português do Brasil — como indicação de quem monta a casa, sem jargão de
marketplace, sem urgência falsa, sem "imperdível" / "melhor do Brasil".

## Produto (fatos reais — use só o que estiver aqui)

- Nome: {{nome}}
- Categoria: {{categoria}}
- Destino/público: {{destino}}
- Loja: {{plataforma}}
- Descrição da loja (pode vir suja, HTML ou genérica — reescreva, não copie): {{descricao}}
- Nota editorial já existente: {{notaEditorial}}

## O que gerar

- `descricao`: 1 ou 2 parágrafos curtos (3–5 frases no total) dizendo o que
  é o produto e em que situação de casa ele entra. Sem preço, sem desconto,
  sem "compre agora". Não invente material, medida, voltagem, garantia,
  avaliação, estoque ou certificação que não esteja nos fatos acima.
- `utilidade`: markdown com 1 parágrafo de abertura + uma lista de 3 a 5
  itens (`-`) com usos práticos concretos ("para que serve" no dia a dia).
  Cada item: uma linha, benefício observável, sem slogan. Se a categoria
  for limpeza/química, não dê receita de mistura de produtos.
- `resumo`: 1 frase até ~155 caracteres, para meta description e card.
- `notaEditorial`: 1–2 frases, "para que serve / por que faz sentido na
  casa". Sem marketing vazio.

## Regras inegociáveis

1. Não invente especificação, marca complementar, preço, desconto, frete,
   prazo, avaliação nem estoque.
2. Não inclua URL, preço (R$), percentual de desconto nem disclosure de
   afiliado — o sistema coloca o card e o link depois.
3. Não use o shortcode `[produto:…]` nem o título como `#`.
4. Se a descrição da loja for inútil ou contraditória, ignore-a e escreva
   só a partir do nome e da categoria, com honestidade (sem fingir detalhe).
