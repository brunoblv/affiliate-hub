# Fundos de arte — Meu Novo Lar

Coloque aqui os fundos quadrados (1080×1080 px, PNG) gerados pra identidade
visual do Meu Novo Lar (ver `docs/Meu Novo Lar visual design/Fundos Templates
Arte.dc.html` pro mockup de referência — paleta, tipografia Newsreader/Manrope,
wordmark). O pipeline de composição (`lib/artes/`) só lê o que estiver aqui;
sem o arquivo, o sistema publica com a foto/capa crua (comportamento antigo),
sem quebrar nada.

## Convenção de pastas

```
public/fundos-posts/
  produto/1.png  2.png  3.png   — post de produto avulso (foto + preço)
  lista/1.png    2.png  3.png   — roundup de vários produtos (capa + título)
  oferta/1.png   2.png  3.png   — landing diária / vitrine (selo + de/por)
  jornada/1.png  2.png  3.png   — editorial (foto/hero + título do artigo)
```

3 variantes por tipo — o sistema escolhe uma de forma determinística a partir
do id do produto/post/landing (mesmo item sempre sai com a mesma variante,
pra dar variedade sem ficar aleatório a cada regeneração).

## O que já vem pronto no fundo x o que o sistema desenha por cima

O PNG do fundo já deve trazer: cor/gradiente de base, textura/decoração,
wordmark "MEU NOVO LAR" e (no tipo oferta) a cor de base do selo. O pipeline
só desenha por cima:

- a foto do produto/capa, recortada na zona reservada (retângulo ou círculo,
  com cantos arredondados);
- o título (Newsreader);
- preço atual/original quando existir (Manrope);
- o texto do selo, no tipo oferta.

As zonas (posição/tamanho de cada uma) já estão mapeadas em
`lib/artes/layouts.ts`, seguindo o mockup — se as variantes reais tiverem
zonas de foto/texto em posição diferente, ajuste os percentuais lá.

## Dimensões

1080×1080 px. Formato retangular (Facebook/blog) ainda não tem convenção —
entra numa pasta separada quando for definido.
