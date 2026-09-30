# Alertas por e-mail e navegador

Os dois canais usam a variação, condição novo/usado e pagamento confirmados no alerta. Os links abrem o comparador nesse contexto; a saída para a loja continua pelo link rastreado. Push tem estado próprio por alerta/dispositivo e funciona mesmo sem SMTP.

## Configuração

1. Aplicar as migrations e gerar o client Prisma no ambiente de implantação.
2. Configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM para e-mail.
3. Gerar uma única vez `npx web-push generate-vapid-keys --json`. Guardar VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (um `mailto:` de contato real) no servidor e no worker. Não trocar o par após inscrições sem planejar renovação das permissões. A chave privada nunca é enviada ao cliente.
4. Configurar NEXT_PUBLIC_SITE_URL com o domínio real, HTTPS e autenticação Google funcional. Manter o worker em execução.
5. Rodar `npm run notifications:verify`: valida VAPID e, quando configurado, conexão/autenticação SMTP, sem enviar mensagens. Isso não confirma entrega na caixa de entrada.
6. Entrar em `/conta` no dispositivo real e escolher “Ativar notificações”. A permissão só é solicitada no clique. No iPhone/iPad é necessário adicionar o site à Tela de Início e abri-lo por ela.

## Comportamento

- Inscrições pertencem à conta. Ativar em outra conta no mesmo navegador renova a inscrição local; o endpoint anterior não é transferido.
- Desativar remove a inscrição do servidor e cancela a inscrição do navegador. Excluir a conta remove inscrições e estados por cascata. Sair da conta não desativa push: usar apenas dispositivo próprio e desativar antes de compartilhá-lo.
- Uma reserva persistente impede dois workers de enviarem simultaneamente o mesmo aviso. Preço acima da meta rearma o canal; alteração do contexto/meta reinicia o estado. A revisão do SMTP não duplica push.
- Respostas 404/410 removem a inscrição. Rejeições 429/5xx têm no máximo três tentativas com espera. Timeout ou interrupção ficam incertos e não são reenviados automaticamente nessa passagem pela meta.
- “Enviado” significa aceito pelo serviço de push, não comprova exibição no dispositivo. O payload expira em 15 minutos; o comparador exibe os dados atuais ao abrir.
- A conta informa falhas/resultados incertos. Desativar e ativar novamente permite reenviar avisos na meta; isso pode repetir uma mensagem cuja entrega ficou incerta.
- Endpoints são restritos a provedores de push conhecidos; novos provedores exigem revisão da allowlist. Endpoints e chaves não devem entrar em logs.

## Homologação pendente

No ambiente local, SMTP e VAPID ainda não estão configurados. Testes automatizados usam transporte simulado e fixtures isoladas no PostgreSQL. Antes da produção, validar permissão, recebimento com site fechado, clique no contexto correto, desativação, troca de conta e expiração em navegadores reais; realizar um envio SMTP para destinatário de teste autorizado.

Referências: [Web Push para Node](https://github.com/web-push-libs/web-push) e [inscrição no navegador](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).
