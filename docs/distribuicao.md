# Distribuição de ofertas — Telegram

Entrega 6b inicial. O Hub tem uma fila própria, sem imports do Meu Novo Lar. Nenhuma configuração habilita postagens por si só: são necessários destino ativo, bot configurado, `DISTRIBUTION_ENABLED=true`, worker em execução e aprovação de cada agendamento no admin.

## Configuração

1. Com o PostgreSQL disponível, executar `npx prisma migrate deploy` e `npx prisma generate`. Inclui as migrações aditivas de comunidades e distribuição, sem remoção de tabelas.
2. Definir `NEXT_PUBLIC_SITE_URL` com a origem HTTPS pública do Hub. Nunca usar o domínio do blog como endereço comercial do Hub.
3. Configurar `TELEGRAM_BOT_TOKEN` no ambiente do servidor. Adicionar o bot ao grupo/canal e conceder as permissões necessárias. O token não vai no admin ou no convite público.
4. Em Comunidades, cadastrar o **ID numérico negativo** do chat como identificador de publicação. Não aceitar nomes `@canal` evita que dois aliases burlem os limites por destino. O convite público continua separado.
5. Em Distribuição, escolher produto publicado, oferta/link específico, destino do mesmo nicho e capa opcional. Preparar a prévia não envia nada.
6. Conferir prévia, capa e destino. Aprovar e escolher horário de São Paulo. O botão autoriza o envio futuro daquele registro.
7. Habilitar `DISTRIBUTION_ENABLED=true` quando quiser operar e executar `npm run worker`. Para pausar, desabilitar a variável e reiniciar o worker. O modo `sync:once` processa no máximo uma publicação por passagem do loop e também respeita a chave de habilitação.

## Regras implementadas

- Apenas `oferta_individual` no Telegram nesta entrega: até 3 por dia/destino, intervalo de 1 hora e deduplicação por produto ou similaridade de título >= 70% em 7 dias (inclui agendamentos futuros). Horários no fuso America/Sao_Paulo. A fila atrasada é revalidada para não publicar tudo ao reiniciar.
- Oferta deve ter estoque confirmado, preço positivo conferido há menos de 24 horas e nenhum erro/revisão. Oferta manual também segue 24 horas para divulgação. Se vencida, atualizar em Preços/Ofertas e preparar novamente; o publicador não inventa preço nem estoque.
- Único CTA é `/go/codigo` do link escolhido; não troca a oferta nem usa URL original da loja. Mudança de link, preço, condição, frete, dados do produto, destino ou capa invalida a aprovação. Nova coleta sem mudança comercial apenas atualiza a data mostrada.
- Capas aprovadas são enviadas por upload local, sem tornar a rota administrativa pública. O template atual só é aceito para variação única/novo. Capa com preço não pode omitir condição Pix/app/clube, ter preço divergente ou data vencida. Produtos com múltiplas variações usam texto até haver template específico.
- Registro conserva produto, oferta, link, nicho, destino, texto, preço observado, capa e ID externo. IDs de catálogo são snapshots, sem mover registros históricos se o catálogo mudar. Capas vinculadas ao histórico não podem ser excluídas.
- Reserva serializada no PostgreSQL e índice parcial impedem dois envios simultâneos para o mesmo chat. Toda mudança de preço e validade é conferida novamente antes da chamada externa.
- Sucesso confirmado marca publicação e capa como publicadas. Somente `429` explícito permite até três tentativas com a espera indicada. Falhas conclusivas ficam no painel. Timeout/resposta ambígua/interrupção de worker ficam **incertos**, sem reenvio automático. Não há promessa de entrega exatamente uma vez pela API externa.
- Após conferir manualmente o Telegram, o administrador pode registrar o ID da mensagem enviada ou cancelar um resultado incerto. Isso nunca envia uma nova mensagem.
- Mensagens de falha não armazenam token nem resposta bruta da API. Histórico de tentativas aparece no admin.

## Validação

`node --import tsx --test lib/communities/validation.test.ts lib/distribution/rules.test.ts lib/distribution/prepare.test.ts lib/distribution/telegram.test.ts`

Os testes de transporte usam fetch simulado; nenhum post real é enviado. Executar também `npx tsc --noEmit -p tsconfig.json`. Validação de migração, concorrência entre workers e fluxo autenticado depende de PostgreSQL disponível; envio real depende de destino de teste autorizado.

Referência do transporte: [Telegram Bot API — sendPhoto](https://core.telegram.org/bots/api#sendphoto), [sendMessage](https://core.telegram.org/bots/api#sendmessage) e [ResponseParameters](https://core.telegram.org/bots/api#responseparameters). O padrão de transporte foi adaptado de `lib/publicacao/publicadores.ts` do projeto editorial, preservando independência entre repositórios.

## Próximos incrementos

WhatsApp e Facebook não estão habilitados nesta entrega. Facebook deve incorporar integralmente `docs/hub/regras-postagem-facebook.md` do projeto editorial: tipos de conteúdo obrigatórios, limite de 2–3 ofertas/dia, similaridade em 7 dias, mix semanal de seleção/narrativa e link em comentário. Não reutilizar o fluxo de oferta individual como se cobrisse esse mix. Ajustes de limites por destino e atualização assistida automática de ofertas vencidas ficam para evolução.
