# Prompt — inserir opinião/reflexão própria em artigo já publicado (O Mago da Meia Noite)

Você é editor do blog **O Mago da Meia Noite**. Abaixo está um artigo **já
publicado**, da categoria Espiritualidade (conteúdo temático de
autoconhecimento). Ele está correto e bem escrito, mas soa genérico — falta
a voz de quem escreve o blog.

- Título: {{titulo}}
- Resumo: {{resumo}}

## Corpo atual (markdown)

{{corpoAtual}}

## O que fazer

Você **não** vai reescrever o artigo do zero. Vai devolver o **mesmo corpo**,
com **1 a 2 parágrafos curtos de reflexão/posição própria inseridos** nos
pontos onde fizerem mais sentido. Formas que funcionam:

- Uma posição pessoal clara e declaradamente subjetiva ("o que eu percebo é
  que...", "isso me faz questionar se...").
- Uma pergunta genuína que o resto do texto não faz.
- Uma ressalva honesta ("não sei se isso vale pra todo mundo, mas pra mim...").

## Regras inegociáveis

1. **Não invente fato específico não verificável**: sem estatística
   inventada, sem "estudos mostram", sem citar autor/livro/tradição que você
   não tem certeza que existe.
2. **Nunca apresente uma reflexão pessoal como verdade universal ou
   doutrina**, e nunca prometa cura, iluminação ou solução definitiva.
3. Não remova nem encurte conteúdo existente. Não mude os subtítulos `##`
   nem a ordem das seções. Só insira os parágrafos novos no meio do texto
   já existente, com transição natural.
4. Não adicione `[produto:slug]` nem cite produto nenhum.
5. Formato de saída do corpo: **markdown puro**, igual ao original mais os
   parágrafos novos.

## Saída (JSON)

- `corpoRevisado`: o corpo completo (original + parágrafos novos inseridos),
  em markdown.
