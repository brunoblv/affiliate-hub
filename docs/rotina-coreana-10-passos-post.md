Qual a melhor estratégia para tentar vender produtos coreanos de beleza no Pinterest? Eu sou afiliado do mercado livre

Pinterest é bom pra isso porque funciona mais como motor de busca visual do que rede social — o conteúdo tem vida útil longa (pins continuam gerando tráfego meses depois) e o público já vai lá com intenção de compra/descoberta, o que casa bem com afiliados.

Estrutura de conteúdo

Crie boards temáticos específicos (não um genérico "beleza coreana"): "Skincare coreana para pele oleosa", "Rotina de 10 passos K-beauty", "Dupes coreanos de produtos caros", etc. Boards nichados performam melhor no algoritmo do Pinterest.
Pins do tipo "antes/depois", "rotina passo a passo" e "comparativo de produtos" convertem bem porque respondem a uma dúvida direta.
Use Idea Pins (formato carrossel/vídeo) para conteúdo educativo — eles têm mais alcance orgânico que pins estáticos no momento.

Sobre o link de afiliado

Pinterest permite link de afiliado direto no pin, mas idealmente crie uma landing page própria (ou usa um link encurtado com preview decente) em vez de jogar o link cru do Mercado Livre — pins com destino "genérico" de e-commerce tendem a converter pior que os que levam pra algo com contexto.
Deixe claro que é link de afiliado (obrigatório por transparência e evita problema com a plataforma).

SEO no Pinterest

Título e descrição do pin importam muito — use termos de busca reais ("melhor protetor solar coreano", "hidratante coreano pele mista") em vez de títulos criativos vagos.
Nome dos boards e da conta também entram na indexação.

Cadência

Consistência bate volume: pins diários (mesmo que 3-5) performam melhor que picos esporádicos. Dá pra usar o Pinterest scheduler nativo ou Tailwind pra programar.

Uma landing page no meu site?

Sim, isso costuma converter melhor do que mandar o tráfego direto pro Mercado Livre. Algumas vantagens:

Você controla a experiência (sem concorrência visual de outros produtos, sem os "sugeridos" do ML roubando o clique)
Consegue agrupar vários produtos numa página temática ("Rotina K-beauty pele oleosa") e linkar cada um pro Mercado Livre
Melhora a taxa de clique nos pins do Pinterest, porque o preview da página é mais controlado e "confiável" do que um link cru de e-commerce
Dá pra adicionar contexto (comparação, review curto, "por que eu recomendo") que aumenta a conversão
Estrutura simples que funciona bem:

Uma página por nicho/board (não uma landing genérica única), com:

Título alinhado ao termo de busca do Pinterest
1 imagem/vídeo curto do produto em uso
Bullet points rápidos (benefício, pra que tipo de pele, etc)
Botão CTA claro pro link de afiliado
Disclosure de afiliado visível
Como você trabalha com Next.js, dá pra fazer isso bem leve: uma rota dinâmica tipo /produtos/[slug] puxando de um array/CMS simples (ou até um JSON estático), com SSG pra carregar rápido — isso importa bastante pro SEO orgânico também, já que a página pode rankear no Google além do tráfego do Pinterest.

Quer que eu monte a estrutura dessa página (componente + dados) pra você usar como ponto de partida?

Faça os requisitos dessa landing page que eu pedir para gerar, tenha em mente que é o site https://meunolar.com que eu vou usar.


Orchestrated requirements framework para landing page em português
Orchestrated requirements framework para landing page em português
Aqui estão os requisitos da landing page de afiliados pro meunolar.com:

Rota e estrutura

/produtos/[slug] — SSG (getStaticProps/generateStaticParams se App Router), uma página por nicho ou por produto
Dados vindos de um JSON/array estático inicialmente (dá pra migrar pra CMS depois)
Sitemap dinâmico incluindo essas rotas, pra indexação no Google
Campos de dados por página

slug, titulo, metaDescription (otimizados pra termo de busca)
imagemPrincipal (+ alt text descritivo)
resumo (1-2 frases, contexto do produto)
beneficios[] (bullet points)
paraQuemE (tipo de pele, uso indicado)
linkAfiliado (URL do Mercado Livre)
preco opcional (se quiser exibir, mas cuidado: desatualiza rápido)
disclosureAfiliado (texto fixo de transparência)
SEO técnico

Meta tags dinâmicas (title, description, OG image) por página, puxadas dos dados
URL amigável e alinhada ao termo que você usa no Pinterest
Schema.org tipo Product ou Review (rich snippets ajudam CTR no Google)
Performance: imagem otimizada (next/image), LCP baixo — importa pro ranqueamento e pra retenção do clique vindo do Pinterest
Componentes

Header simples (nome do site/marca)
Bloco de imagem + título + resumo
Lista de benefícios
CTA principal (botão) — deve abrir o link de afiliado em nova aba com rel="sponsored noopener"
Bloco de disclosure de afiliado (obrigatório, visível, não escondido no rodapé)
Opcional: seção de "produtos relacionados" (outras páginas do mesmo nicho) pra reter o usuário no site
Compliance/legal

Disclosure de afiliado clara (FTC-style, mesmo sendo Brasil — CDC também exige transparência em publicidade)
Política de privacidade linkada (se ainda não existir no site)
Analytics

Tracking de clique no CTA (evento separado do pageview) — importante pra você saber qual pin/board tá convertendo, não só gerando tráfego

---
slug: rotina-coreana-10-passos-vale-a-pena-conferir
titulo: "Rotina Coreana de 10 Passos: vale a pena conferir"
meta_description: "Rotina coreana de 10 passos: vale a pena conferir. Veja os produtos, pra que tipo de pele e onde comprar com desconto."
categoria: achadinhos-tiktok-beleza-e-cuidados
tempo_leitura: "3 min de leitura"
---

# Rotina Coreana de 10 Passos: vale a pena conferir

A skincare coreana ficou famosa pela rotina de múltiplas camadas, focada em hidratação profunda e prevenção — diferente da rotina "ocidental", que costuma ser mais enxuta e reativa (tratar problemas já existentes). Aqui vai o passo a passo completo, com sugestão de produto pra cada etapa.

## Os 10 passos

### 1. Óleo de limpeza
Remove maquiagem e protetor solar sem ressecar a pele.
**Pra que tipo de pele:** todos os tipos
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 2. Espuma de limpeza
Limpeza profunda dos resíduos que o óleo não remove.
**Pra que tipo de pele:** todos os tipos
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 3. Esfoliante
Remove células mortas, prepara a pele pra absorver os próximos produtos.
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 4. Tônico
Reequilibra o pH da pele e prepara pra hidratação.
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 5. Essência
Hidratação leve e ativos de reparação da pele.
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 6. Sérum/Ampola
Tratamento concentrado (ex: vitamina C, niacinamida, centella).
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 7. Máscara facial
Hidratação e tratamento intensivo, uso 2-3x por semana.
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 8. Contorno dos olhos
Área mais fina da pele, precisa de cuidado específico.
**Pra que tipo de pele:** todos os tipos
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 9. Hidratante
Sela a hidratação de todas as camadas anteriores.
**Pra que tipo de pele:** [preencher]
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

### 10. Protetor solar
Proteção contra danos causados pelo sol — passo essencial mesmo em dias nublados.
**Pra que tipo de pele:** todos os tipos
**Produto:** [Nome do produto] 💰 R$ [preço]
🔗 [link de afiliado]

## Oferta em destaque

**[Nome do produto]**
DE R$ [preço cheio] 🔥 POR R$ [preço com desconto] 📉 [%] OFF

---

Confira mais achadinhos de beleza coreana → [link da categoria]

---

## Dados estruturados (para CMS/JSON)

```json
{
  "slug": "rotina-coreana-10-passos-vale-a-pena-conferir",
  "titulo": "Rotina Coreana de 10 Passos: vale a pena conferir",
  "categoria": "achadinhos-tiktok-beleza-e-cuidados",
  "tempoLeitura": "3 min de leitura",
  "passos": [
    {
      "numero": 1,
      "nome": "Óleo de limpeza",
      "descricao": "Remove maquiagem e protetor solar sem ressecar",
      "paraQuemE": "Todos os tipos de pele",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 2,
      "nome": "Espuma de limpeza",
      "descricao": "Limpeza profunda dos resíduos que o óleo não remove",
      "paraQuemE": "Todos os tipos de pele",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 3,
      "nome": "Esfoliante",
      "descricao": "Remove células mortas, prepara a pele pra absorver os próximos produtos",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 4,
      "nome": "Tônico",
      "descricao": "Reequilibra o pH da pele e prepara pra hidratação",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 5,
      "nome": "Essência",
      "descricao": "Hidratação leve e ativos de reparação da pele",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 6,
      "nome": "Sérum/Ampola",
      "descricao": "Tratamento concentrado (ex: vitamina C, niacinamida, centella)",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 7,
      "nome": "Máscara facial",
      "descricao": "Hidratação e tratamento intensivo, uso 2-3x por semana",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 8,
      "nome": "Contorno dos olhos",
      "descricao": "Área mais fina da pele, precisa de cuidado específico",
      "paraQuemE": "Todos os tipos de pele",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 9,
      "nome": "Hidratante",
      "descricao": "Sela a hidratação de todas as camadas anteriores",
      "paraQuemE": "",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    },
    {
      "numero": 10,
      "nome": "Protetor solar",
      "descricao": "Proteção contra danos causados pelo sol — passo essencial mesmo em dias nublados",
      "paraQuemE": "Todos os tipos de pele",
      "produto": { "nome": "", "linkAfiliado": "", "preco": "" }
    }
  ]
}
```
