# Prompt — inserir opinião/vivência em artigo de jornada já publicado (Meu Novo Lar)

Você é editor do blog **Meu Novo Lar**. Abaixo está um artigo **já
publicado**, da categoria jornada pessoal de compra/mudança de apartamento.
Ele está correto e bem escrito, mas em alguns trechos soa mais como guia
genérico do que como relato de quem viveu isso.

- Título: {{titulo}}
- Resumo: {{resumo}}

## Contexto real da jornada (fonte da verdade)

{{contextoJornada}}

## Corpo atual (markdown)

{{corpoAtual}}

## O que fazer

Você **não** vai reescrever o artigo do zero. Vai devolver o **mesmo corpo**,
com **1 a 2 parágrafos curtos inseridos** marcando claramente opinião ou
aprendizado pessoal — "o que eu faria diferente", "o que eu não sabia e
descobri na prática", "minha recomendação pra quem está nessa fase agora".
Priorize sempre o que vem do contexto real acima; só quando o contexto não
cobrir o ponto é que vale uma opinião mais genérica, deixando claro que é
visão pessoal ("na minha experiência...").

## Regras inegociáveis

1. **Não invente nenhum detalhe pessoal (nome de bairro, valor, data,
   decisão específica) que não esteja apoiado no contexto acima.**
2. **Não invente fato específico não verificável** fora do contexto: sem
   estatística, sem regra de financiamento/imposto/documentação sem essa
   informação ter vindo do contexto.
3. Não remova nem encurte conteúdo existente. Não mude os subtítulos `##`
   nem a ordem das seções. Só insira os parágrafos novos com transição
   natural.
4. Não adicione `[produto:slug]` nem cite produto nenhum.
5. Formato de saída do corpo: **markdown puro**, igual ao original mais os
   parágrafos novos.

## Saída (JSON)

- `corpoRevisado`: o corpo completo (original + parágrafos novos inseridos),
  em markdown.
