# Fundos de arte — Meu Novo Lar

Coloque aqui os fundos gerados pra identidade visual do Meu Novo Lar (ver
`docs/Meu Novo Lar visual design (1)/Fundos Templates Arte.dc.html` pro
mockup de referência — paleta, tipografia Newsreader/Manrope, wordmark). O
pipeline de composição (`lib/artes/`) só lê o que estiver aqui; sem o
arquivo, o sistema publica com a foto/capa crua (comportamento antigo), sem
quebrar nada.

## Convenção de pastas

```
public/fundos-posts/
  quadrado/produto/1.png  2.png  3.png   — 1080×1080
  quadrado/lista/1.png    2.png  3.png
  quadrado/oferta/1.png   2.png  3.png
  quadrado/jornada/1.png  2.png  3.png

  retangular/produto/1.png                — 1200×630 (só 1 variante)
  retangular/lista/1.png
  retangular/oferta/1.png
  retangular/jornada/1.png
```

- **Quadrado** (1080×1080): Instagram, Pinterest, Telegram, WhatsApp. 3
  variantes por tipo — o sistema escolhe uma de forma determinística a
  partir do id do produto/post/landing (mesmo item sempre sai com a mesma
  variante).
- **Retangular** (1200×630): Facebook (página/grupo), publicado via
  `/photos` no feed. Só 1 variante por tipo por enquanto. Jornada retangular
  não tem foto (é a única exceção: o fundo já traz o hero embutido, o
  pipeline só escreve o título por cima) — hoje ainda não é usada porque
  posts de Jornada no Facebook saem sem imagem própria (preview do link do
  artigo); fica pronta pra quando isso mudar.

## O que já vem pronto no fundo x o que o sistema desenha por cima

O PNG do fundo já deve trazer: cor/gradiente de base, textura/decoração,
wordmark "MEU NOVO LAR" e (no tipo oferta) a cor de base do selo. O pipeline
só desenha por cima:

- a foto do produto/capa, recortada na zona reservada (retângulo ou
  círculo, com cantos arredondados) — exceto jornada retangular, que não
  tem essa zona;
- o título (Newsreader);
- preço atual/original quando existir (Manrope);
- o texto do selo, no tipo oferta.

As zonas (posição/tamanho de cada uma) já estão mapeadas em
`lib/artes/layouts.ts`, seguindo o mockup — se as variantes reais tiverem
zonas de foto/texto em posição diferente, ajuste os percentuais lá.
