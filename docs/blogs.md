# Blogs nos subdomínios

O Capibusca serve blogs editoriais em `<subdomínio>.capibusca.com.br`. O primeiro é o
**Meu Novo Lar** (`meunovolar.capibusca.com.br`), que veio do projeto `meu-novo-lar`. Os cards
de produto dos posts usam o catálogo do comparador: menor preço, botão `/go` da oferta e link
para a comparação completa.

## Como funciona

- `proxy.ts` reescreve `meunovolar.capibusca.com.br/x` para `/b/meunovolar/x` (`app/b/[blog]/`).
  `/_next`, `/midia`, `/api` e arquivos estáticos passam direto. `/b/...` acessado pelo host
  principal recebe 308 para o subdomínio, para não haver conteúdo duplicado.
- Cada blog é uma linha em `blogs` (admin: **Blogs → Blogs**). Subdomínio sem blog ativo dá 404.
- Rotas do blog: `/` (artigos), `/blog/<slug>`, `/busca`, `/sobre`, `/robots.txt`, `/sitemap.xml` e `/feed.xml`.
- Só os posts **Editorial** aparecem na listagem, na busca e no sitemap. **Listas** e **fichas de
  produto** abrem pelo link direto, com `noindex`.
- Corpo em markdown com shortcodes em linha própria: `[produto:slug]` (card do catálogo) e
  `[cta:https://meli.la/…|Rótulo]` (botão; aceita meli.la, s.click.aliexpress.com, s.shopee.com.br e `/go/código`).
- Produto citado que está em **rascunho** no catálogo não aparece no post. O editor tem
  "Conferir produtos citados", com botão para publicá-los.
- A mídia fica em `MEDIA_DIR` (padrão `storage/media`) e sai por `/midia/...`.

### Arquivos por blog (`content/blogs/<subdomínio>/`)

| Arquivo | Uso |
|---|---|
| `prompts/*.md` | Voz do blog: temas, artigos, opinião, ficha de produto, listas e LarSmart |
| `listas.json` | Pautas de listas ("5 produtos indispensáveis na cozinha") |
| `capas.json` | Cenas das capas geradas por IA (tema por palavra-chave, cor do fundo) |
| `fundos/capa/<jornada\|lista\|produto>/N.png` | Moldura da marca (1600×900) onde a cena da IA é colada |

A identidade visual (cores e fontes) fica em `lib/blog/themes.ts`. Os prompts de espiritualidade
do meu-novo-lar estão em `content/blogs/_espiritualidade/` para um blog futuro.

### Admin (`/admin/blog`)

Posts, **Artigo com IA** (tema e artigo pelo Gemini, com as notas da Jornada nas linhas de
jornada), **Lista por pauta**, **LarSmart** (tema livre → produtos → texto → capa e imagens de
ambiente pela OpenAI; o que faltar no catálogo é importado da Shopee como rascunho), **Jornada**
e **Blogs**. No editor: capa por upload ou IA, opinião (IA), ficha de produto (IA) e narração (Gemini TTS).

## Colocar no ar

### 1. DNS

Registro **A** `meunovolar` → `200.234.219.137` (o mesmo IP de capibusca.com.br). Para não
repetir isso a cada blog, um curinga `*` → mesmo IP também resolve.

### 2. Variáveis (`.env` do servidor)

Ver `.env.example`. As novas são `MEDIA_DIR` (volume persistente, ex.: `/var/lib/capibusca/media`)
e `OPENAI_API_KEY` (capas). `BLOG_BASE_DOMAIN` pode ficar vazio: o padrão vem de
`NEXT_PUBLIC_SITE_URL`. A Gemini usa a `GEMINI_API_KEY` que já existe.

### 3. nginx

O subdomínio aponta para o mesmo app (porta 3001). O `Host` precisa chegar ao Next, porque é
ele que define o blog. As ações de IA demoram até ~2 min, daí o timeout maior.

```nginx
server {
    server_name meunovolar.capibusca.com.br;   # ou *.capibusca.com.br com certificado curinga
    client_max_body_size 30m;                  # upload de imagem (o app aceita até 25 MB)

    location /midia/ {
        alias /var/lib/capibusca/media/;       # mesmo caminho de MEDIA_DIR (opcional: o app também serve)
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
```

No `server` de `capibusca.com.br`, suba também `proxy_read_timeout 300s` e
`client_max_body_size 30m` (o admin fica no domínio principal). Certificado:
`sudo certbot --nginx -d meunovolar.capibusca.com.br`.

### 4. Deploy

```bash
git pull && npm ci
npx prisma migrate deploy      # cria blogs, posts, media etc. Só acrescenta tabelas, não mexe nas existentes.
npm run build && npm run pm2:reload
```

### 5. Migrar o conteúdo do meunovolar.com

Faça backup dos dois bancos antes. O script só **lê** o banco do meu-novo-lar.

```bash
export MEUNOVOLAR_DATABASE_URL="postgresql://…/meu_novo_lar"
export MEUNOVOLAR_MEDIA_ROOT="/var/lib/affiliate-hub/midia"   # MEDIA_ROOT do meu-novo-lar
npm run blog:migrar-meunovolar              # simulação: mostra o que faria
npm run blog:migrar-meunovolar -- --aplicar # grava
```

O script mantém os slugs, copia a mídia com o mesmo caminho `/midia/...`, casa os produtos
citados com o catálogo (mesma loja e ID externo) ou cria em rascunho, e **recria os códigos
`/go/<código>` antigos** como links de afiliado. Assim os links já publicados nas redes seguem
valendo pelo `capibusca.com.br/go/…` (o produto precisa estar publicado). Posts dos destinos
Mago da Meia Noite e Umbanda ficam de fora (`--destinos=` muda isso). Reexecutar é seguro.
Depois, revise em `/admin/produtos` os produtos criados em rascunho.

### 6. Redirecionar meunovolar.com (301)

Só depois de conferir o subdomínio. No nginx do meunovolar.com:

```nginx
server {
    server_name meunovolar.com www.meunovolar.com;

    location /go/      { return 301 https://capibusca.com.br$request_uri; }
    location = /blog   { return 301 https://meunovolar.capibusca.com.br/; }
    location /blog/    { return 301 https://meunovolar.capibusca.com.br$request_uri; }
    location /midia/   { return 301 https://meunovolar.capibusca.com.br$request_uri; }
    location = /sobre  { return 301 https://meunovolar.capibusca.com.br/sobre; }
    location = /equipe { return 301 https://meunovolar.capibusca.com.br/sobre; }
    location = /contato        { return 301 https://capibusca.com.br/contato; }
    location = /privacy-policy { return 301 https://capibusca.com.br/politica-de-privacidade; }
    location = /terms          { return 301 https://capibusca.com.br/termos-de-uso; }
    location = /buscar { return 301 https://meunovolar.capibusca.com.br/busca$is_args$args; }
    location /         { return 301 https://meunovolar.capibusca.com.br/; }
}
```

Mantenha o certificado de meunovolar.com renovando: o redirecionamento precisa de HTTPS. No
Google Search Console, use "Mudança de endereço" de meunovolar.com para o subdomínio.

Ficam para depois: as ferramentas (`/ferramentas`, calculadoras de piso e tinta), a newsletter
e a distribuição de posts nas redes, que não foram portadas.
