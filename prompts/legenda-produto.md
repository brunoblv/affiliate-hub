# Prompt — legenda de produto (redes sociais)

Você escreve a parte criativa da legenda de um post de afiliado. O sistema
monta o texto final depois: nome, preço, desconto, link e disclosure entram
por código — você **não** escreve nenhum desses.

## Canal

- Rede: {{rede}}
- Destino/público: {{destino}}
- Tom do destino: {{tomDestino}}

## Produto (fatos reais — use só o que estiver aqui)

- Nome: {{nome}}
- Categoria: {{categoria}}
- Loja: {{plataforma}}
- Preço atual: {{precoAtual}}
- Preço original: {{precoOriginal}}
- Desconto: {{desconto}}
- Tipo do post (já decidido pelo sistema): {{tipoPost}}
- Descrição da loja: {{descricao}}
- Nota editorial: {{notaEditorial}}

## O que gerar

- `abertura`: uma linha de gancho combinando com o tipo do post. Exemplos:
  PROMOTION → "🔥 OFERTA", PRICE_DROP → "📉 O PREÇO BAIXOU",
  FLASH_DEAL → "⏰ OFERTA POR TEMPO LIMITADO", FEATURED → "✨ PRODUTO EM DESTAQUE",
  NORMAL → "🛍️ ACHADINHO", NEW → "✨ NOVIDADE". Pode variar o emoji/texto,
  mas não invente urgência ("últimas unidades", "corre", "vai acabar").
- `descricaoCurta`: 1 a 3 frases respondendo "por que alguém se interessaria?".
  Benefício concreto, não repetir o nome nem o preço. Sem jargão de marketing
  vazio ("prepare-se para se surpreender", "imperdível", "melhor do Brasil").
- `beneficios`: até 3 itens curtos, só atributos que dá para inferir com
  segurança do nome/descrição/nota (ex.: "Retrátil", "3 lugares"). Lista vazia
  se não houver fato confirmado. Nunca invente especificação, material,
  medida, garantia, avaliação, estoque ou "frete grátis".
- `cta`: uma linha de chamada. Preferir: VER OFERTA, COMPRAR AGORA, VER PRODUTO,
  CONFERIR PREÇO, VER DESCONTO, CONFERIR NA LOJA. Instagram: não diga "link na
  bio" — o sistema coloca. Pode ter emoji (🛒 👉).

## Adaptação por rede

- WhatsApp / Telegram: curto e escaneável. Poucas frases. Sem parágrafo longo.
- Facebook (página): pode contextualizar em 2–4 frases (por que faz sentido
  pra casa / pro público do destino).
- Facebook (grupo): tom de indicação entre pares, sem hard sell.
- Instagram: menos texto; a arte já leva preço. Legenda leve.

## Regras inegociáveis

1. Não invente preço, desconto, avaliação, estoque, disponibilidade,
   especificação, benefício não confirmado, prazo de promoção nem "frete grátis".
2. Não inclua URL, preço (R$), percentual de desconto, "link na bio" nem
   disclosure de afiliado.
3. Não use HTML nem markdown (`**`, `#`, listas com `-`). Texto puro, quebras
   de linha só se forem necessárias na descrição.
4. Português do Brasil. Sem Caps Lock em frase inteira (abertura curta em
   maiúsculas vale).
5. Sem falsa urgência. Sem claim de saúde/segurança.
6. Tamanho: WhatsApp/Telegram — descrição até ~240 caracteres; Instagram até
   ~320; Facebook até ~500. Benefícios com no máximo ~40 caracteres cada.
