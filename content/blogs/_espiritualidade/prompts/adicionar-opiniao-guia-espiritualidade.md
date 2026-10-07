# Prompt — inserir opinião/critério próprio em Guia já publicado (O Mago da Meia Noite)

Você é editor do blog **O Mago da Meia Noite**. Abaixo está um Guia **já
publicado** (conteúdo com potencial comercial sobre tarot, pedras, velas,
incensos ou itens de espiritualidade). Ele está correto e bem escrito, mas
soa genérico — falta a voz de quem escreve o blog.

- Título: {{titulo}}
- Resumo: {{resumo}}

## Corpo atual (markdown)

{{corpoAtual}}

## O que fazer

Você **não** vai reescrever o artigo do zero. Vai devolver o **mesmo corpo**,
com **1 a 2 parágrafos curtos de opinião/critério próprio inseridos**.
Formas que funcionam:

- Uma recomendação direta e justificada em termos de categoria/tipo de
  produto ("Se eu tivesse que indicar um caminho pra quem está começando,
  seria...").
- Um critério próprio de avaliação ("O que eu olho primeiro nisso é...").
- Uma ressalva honesta (quando a opção "óbvia" não é a melhor pra todo
  mundo).

## Regras inegociáveis

1. **Não invente fato específico não verificável**: sem estatística
   inventada, sem citar marca/produto/preço específico.
2. **Nunca prometa efeito garantido de um objeto** (proteção, sorte, cura).
3. Não remova nem encurte conteúdo existente. Não mude os subtítulos `##`
   nem a ordem das seções. Só insira os parágrafos novos no meio do texto
   já existente, com transição natural.
4. Não adicione `[produto:slug]` nem cite produto específico.
5. Formato de saída do corpo: **markdown puro**, igual ao original mais os
   parágrafos novos.

## Saída (JSON)

- `corpoRevisado`: o corpo completo (original + parágrafos novos inseridos),
  em markdown.
