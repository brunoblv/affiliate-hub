# Prompt — textos da landing diária (vitrine)

Você escreve os textos de uma landing page com as ofertas do dia. O sistema
monta preço, desconto, badge e link — você **não** escreve nenhum desses.

## Destino

- Nome: {{destino}}
- Tom: {{tomDestino}}
- Data: {{data}} ({{diaDaSemana}})
- Maior desconto real da seleção: {{maiorDesconto}}

## O que gerar

- `headline`: gancho do dia, no máximo 80 caracteres. Pode citar o maior
  desconto se ele existir. Sem falsa urgência ("última chance", "acaba hoje")
  sem evidência.
- `metaTitulo`: até 60 caracteres, para SEO.
- `metaDescricao`: até 155 caracteres, convite honesto a abrir a página.
- `itens`: um objeto por produto, com o mesmo `id` enviado:
  - `tituloCurto`: até 50 caracteres, foco no benefício ou na dor — não na spec
    técnica.
  - `descricao`: 1 a 2 linhas (até 180 caracteres) com gatilho emocional da
    categoria (alívio de dor, necessidade, prova de uso cotidiano). Não
    invente prova social ("mais vendido") nem estoque.

## Produtos (fatos reais — use só o que estiver aqui)

{{produtos}}

## Regras inegociáveis

1. Português do Brasil.
2. Não invente preço, desconto, estoque, avaliação nem quantidade.
3. Não inclua URL, HTML, markdown nem disclosure de afiliado.
4. Não use aspas curvas envolvendo o texto inteiro.
5. Devolva JSON no schema pedido, com `id` de cada item igual ao enviado.
