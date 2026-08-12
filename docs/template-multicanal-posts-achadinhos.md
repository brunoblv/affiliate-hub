# Template Multicanal de Posts de Produtos — Achadinhos

## Objetivo

Criar um padrão de publicação para WhatsApp, Telegram, Facebook e Instagram, usando uma base única de dados do produto e adaptando o texto para cada canal.

Prioridade:
1. chamar atenção;
2. mostrar rapidamente o produto e o preço;
3. destacar promoção quando existir;
4. explicar o benefício de forma curta;
5. apresentar CTA claro;
6. direcionar para o link afiliado;
7. informar o caráter de afiliado.

## Ordem das informações

```text
FOTO
↓
TIPO DA PUBLICAÇÃO
↓
NOME
↓
PREÇO
↓
DESCONTO, SE EXISTIR
↓
DESCRIÇÃO CURTA
↓
ATÉ 3 BENEFÍCIOS
↓
CTA
↓
LINK
↓
DISCLOSURE
```

### Exemplo

```text
🔥 OFERTA

Fone Bluetooth X

DE R$ 219,90
POR R$ 149,90

📉 32% OFF

Excelente opção para quem quer praticidade
no dia a dia.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

🛒 VER OFERTA
[LINK]

⚠️ Preço e disponibilidade podem mudar.
*Link de afiliado.
```

## Regra de preço

Só mostrar preço antigo quando houver um preço anterior real e confiável.

### Com promoção

```text
💰 DE R$ 199,90
🔥 POR R$ 149,90
📉 25% OFF
```

### Sem promoção

```text
💰 R$ 149,90
```

Nunca inventar preço anterior ou desconto.

## Tipos de publicação

```text
PROMOTION
PRICE_DROP
FEATURED
NORMAL
NEW
FLASH_DEAL
```

Aberturas sugeridas:

```text
PROMOTION  → 🔥 OFERTA
PRICE_DROP  → 📉 O PREÇO BAIXOU
FLASH_DEAL  → ⏰ OFERTA POR TEMPO LIMITADO
FEATURED    → ✨ PRODUTO EM DESTAQUE
NORMAL      → 🛍️ ACHADINHO
NEW         → ✨ NOVIDADE
```

## WhatsApp

Usar textos curtos e escaneáveis.

```text
🔥 ACHADINHO DO DIA

🛋️ Sofá 3 Lugares Retrátil

💰 DE R$ 1.899
🔥 POR R$ 1.299
📉 32% OFF

Confortável, retrátil e ideal para salas maiores.

✅ 3 lugares
✅ Retrátil
✅ Reclinável

👉 COMPRAR AGORA
[LINK]

⚠️ Preço pode mudar.
*Link de afiliado.
```

Regras:
- preço no início;
- poucos parágrafos;
- no máximo 3 benefícios;
- CTA claro;
- link visível.

## Telegram

Mais promocional e visual.

```text
🔥 ACHADINHO ENCONTRADO

🎧 Fone Bluetooth X

💰 R$ 149,90
🔥 DE R$ 219,90
📉 32% OFF

Excelente opção para quem quer praticidade no dia a dia.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

🛒 👉 VER OFERTA
[LINK]

⏰ Pode mudar sem aviso.
*Link de afiliado.
```

Aberturas padronizadas:

```text
🔥 OFERTA DO DIA
💥 ACHADO
📉 PREÇO BAIXOU
✨ PRODUTO EM DESTAQUE
⏰ FLASH DEAL
```

## Facebook

Pode ser mais contextualizado.

```text
🔥 O preço caiu!

🎧 Fone Bluetooth X

De R$ 219,90 por R$ 149,90
📉 32% OFF

Para quem procura um fone para ouvir música,
assistir vídeos e usar no dia a dia, essa pode
ser uma opção interessante.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

👉 Confira a oferta:
[LINK]

⚠️ Valores e disponibilidade podem mudar.
*Link de afiliado.
```

Tipos:
- oferta;
- queda de preço;
- produto;
- lista.

## Instagram Feed

Mais informação na arte e menos texto na legenda.

### Arte

```text
[IMAGEM GRANDE DO PRODUTO]

🔥 OFERTA

Fone Bluetooth X

DE R$ 219,90
POR R$ 149,90

32% OFF
```

### Legenda

```text
🎧 Achado para quem gosta de ouvir música sem fio.

O Fone Bluetooth X está por R$ 149,90.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

🔗 Confira no link da bio.

⚠️ Preço sujeito a alteração.
*Link de afiliado.
```

## Instagram Stories

Sequência sugerida:

### Story 1

```text
🔥 ACHADO DO DIA
```

### Story 2

```text
[FOTO]

Fone Bluetooth X

DE R$ 219,90
POR R$ 149,90

32% OFF
```

### Story 3

```text
🛒 VER OFERTA

[LINK]
```

## CTA

Preferir:

```text
VER OFERTA
COMPRAR AGORA
VER PRODUTO
CONFERIR PREÇO
VER DESCONTO
CONFERIR NA LOJA
```

Escolha conforme o tipo do post.

## Descrição

Usar aproximadamente 1–3 frases para responder:

> Por que alguém deveria se interessar pelo produto?

Exemplo ruim:

```text
Fone Bluetooth preto com tecnologia Bluetooth
e bateria de 30 horas.
```

Exemplo melhor:

```text
Uma opção prática para quem quer ouvir música
sem fio no dia a dia, seja em casa ou durante
os deslocamentos.
```

Não inventar atributos.

## Benefícios

No máximo 3, usando somente informações confirmadas.

```text
✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração
```

## Urgência

Campo:

```text
urgencyLevel
```

Valores:

```text
NONE
LOW
MEDIUM
HIGH
```

Uso:

```text
NONE   → ✨ Produto em destaque
LOW    → 💥 Vale conferir
MEDIUM → 📉 Preço caiu
HIGH   → ⏰ Oferta por tempo limitado
```

Nunca criar falsa urgência.

Não usar "últimas unidades", "corre" ou "vai acabar" sem evidência.

## Estrutura visual principal

```text
┌───────────────────────────────┐
│        FOTO DO PRODUTO        │
├───────────────────────────────┤
│ 🔥 OFERTA                     │
│                               │
│ NOME DO PRODUTO               │
│                               │
│ DE R$ 199,90                  │
│ R$ 149,90                     │
│ 📉 25% OFF                    │
│                               │
│ Descrição curta do produto.   │
│                               │
│ ✅ Benefício 1                │
│ ✅ Benefício 2                │
│ ✅ Benefício 3                │
│                               │
│        🛒 VER OFERTA          │
└───────────────────────────────┘
```

## Estrutura de dados

```ts
type ProductPostData = {
  postType:
    | "PROMOTION"
    | "PRICE_DROP"
    | "FEATURED"
    | "NORMAL"
    | "NEW"
    | "FLASH_DEAL";

  productName: string;
  shortDescription: string;

  currentPrice?: number;
  previousPrice?: number;
  discountPercent?: number;

  benefits: string[];

  imageUrl: string;
  affiliateUrl: string;

  promotionEndsAt?: Date;
  urgencyLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH";

  marketplace: string;

  disclosure: string;
};
```

## Content Engine

O sistema deve:

1. identificar o tipo do post;
2. validar preço;
3. mostrar preço anterior apenas se existir;
4. calcular desconto com dados reais;
5. selecionar até 3 benefícios;
6. gerar descrição curta;
7. escolher CTA;
8. inserir disclosure;
9. adaptar para o canal.

## IA

A IA pode:
- gerar títulos;
- reescrever descrições;
- criar chamadas;
- adaptar textos;
- gerar variações;
- criar CTA;
- gerar textos editoriais.

A IA nunca deve inventar:
- preço;
- desconto;
- avaliação;
- estoque;
- disponibilidade;
- especificações;
- benefícios não confirmados.

## Validação antes da publicação

Exigir:

```text
✓ Nome
✓ Imagem
✓ Preço, quando disponível
✓ URL afiliada
✓ Marketplace
✓ Descrição
✓ Benefícios
```

Quando houver promoção:

```text
✓ preço atual
✓ preço anterior
✓ desconto calculável
```

Se faltar dado crítico:

```text
PUBLICAÇÃO = BLOQUEADA
```

## Disclosure

Texto padrão:

```text
*Link de afiliado. Podemos receber uma comissão
se você realizar uma compra através deste link,
sem custo adicional para você.
```

O texto pode ter versão curta por canal, desde que continue claro.

## Atualização antes da publicação

Se o preço mudar entre a geração do conteúdo e a publicação:

```text
Preço do post:
R$ 149,90

Preço atual:
R$ 169,90
```

O sistema deve:
- atualizar a fila;
- cancelar a publicação; ou
- regenerar o conteúdo.

Nunca publicar promoção que já não exista.

## Regra central

O sistema deve seguir:

```text
ATENÇÃO
   ↓
CLAREZA
   ↓
VALOR
   ↓
PREÇO
   ↓
CONFIANÇA
   ↓
CTA
```

Ser persuasivo sem inventar informação.

## Exemplo — Promoção

```text
🔥 OFERTA DO DIA

🎧 Fone Bluetooth X

💰 DE R$ 219,90
🔥 POR R$ 149,90
📉 32% OFF

Uma opção prática para ouvir música,
assistir vídeos e usar no dia a dia.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

🛒 VER OFERTA
[LINK]

⚠️ Preço e disponibilidade podem mudar.
*Link de afiliado.
```

## Exemplo — Produto normal

```text
✨ PRODUTO EM DESTAQUE

🎧 Fone Bluetooth X

💰 R$ 149,90

Uma opção prática para quem quer
ouvir música sem fio no dia a dia.

✅ Bluetooth
✅ Microfone integrado
✅ Bateria de longa duração

🛒 VER PRODUTO
[LINK]

*Link de afiliado.
```

## Exemplo — Queda de preço

```text
📉 O PREÇO BAIXOU

💿 Vinil — Álbum X

DE R$ 299,90
POR R$ 239,90

🔥 20% OFF

Uma boa opção para quem está começando
ou aumentando a coleção de vinis.

✅ Edição física
✅ Formato vinil
✅ Produto oficial

👉 CONFERIR PREÇO
[LINK]

*Link de afiliado.
```

## Fluxo final

```text
Produto
   ↓
Dados reais
   ↓
Promoção / preço / oportunidade
   ↓
Content Engine
   ↓
Adaptação por canal
   ↓
Imagem + texto
   ↓
CTA
   ↓
Link afiliado
   ↓
Publicação
   ↓
Clique
   ↓
Conversão
   ↓
Analytics
```

O objetivo é gerar publicações comercialmente eficientes, diferentes para cada canal e sempre baseadas em informações reais.

O link é sempre o link de afiliado, em hipótese nenhuma o link original pode ser divulgado.
