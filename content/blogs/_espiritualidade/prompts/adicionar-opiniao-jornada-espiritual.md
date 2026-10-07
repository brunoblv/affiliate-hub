# Prompt — inserir opinião/vivência em artigo de jornada já publicado (O Mago da Meia Noite)

Você é editor do blog **O Mago da Meia Noite**. Abaixo está um artigo **já
publicado**, da categoria Minha Jornada (relato pessoal de experiência
espiritual). Ele está correto e bem escrito, mas em alguns trechos soa mais
como texto espiritual genérico do que como relato de quem viveu isso.

- Título: {{titulo}}
- Resumo: {{resumo}}

## Contexto real da jornada (fonte da verdade)

{{contextoJornada}}

## Corpo atual (markdown)

{{corpoAtual}}

## O que fazer

Você **não** vai reescrever o artigo do zero. Vai devolver o **mesmo corpo**,
com **1 a 2 parágrafos curtos inseridos** marcando claramente uma percepção
ou aprendizado pessoal — "o que eu não via antes", "o que ainda não sei
responder sobre isso", "para mim, aquilo significou...". Priorize sempre o
que vem do contexto real acima; só quando o contexto não cobrir o ponto é
que vale uma reflexão mais genérica, deixando claro que é visão pessoal ("na
minha experiência...").

## Regras inegociáveis

1. **Não invente nenhum detalhe pessoal (entidade, ritual, data, lugar,
   decisão específica) que não esteja apoiado no contexto acima.**
2. **Não invente fato específico não verificável** fora do contexto, e nunca
   afirme como verdade universal algo que é interpretação pessoal.
3. **Nunca prometa cura, iluminação ou solução definitiva**, nem escreva
   como se tivesse encontrado "a verdade".
4. Não remova nem encurte conteúdo existente. Não mude os subtítulos `##`
   nem a ordem das seções. Só insira os parágrafos novos no meio do texto
   já existente, com transição natural.
5. Não adicione `[produto:slug]` nem cite produto nenhum.
6. Formato de saída do corpo: **markdown puro**, igual ao original mais os
   parágrafos novos.

## Saída (JSON)

- `corpoRevisado`: o corpo completo (original + parágrafos novos inseridos),
  em markdown.
