import "dotenv/config";

/**
 * Descobre o chat_id de grupos/canais onde o bot do Telegram já foi
 * adicionado como admin — precisa de uma mensagem recente enviada no chat
 * (o bot só vê updates a partir do momento em que entra, via getUpdates).
 *
 * Uso (na pasta Sistema-afiliados):
 *   npx tsx scripts/telegram-get-chat-id.ts
 */
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado no .env.");

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const json = await res.json();

  if (!json.ok) {
    throw new Error(`Telegram API error: ${json.description ?? res.statusText}`);
  }

  const seen = new Map<number, string>();
  for (const update of json.result ?? []) {
    const chat = update.message?.chat ?? update.channel_post?.chat;
    if (chat) seen.set(chat.id, `${chat.title ?? chat.username ?? chat.first_name ?? "(sem nome)"} — tipo: ${chat.type}`);
  }

  if (seen.size === 0) {
    console.log(
      "Nenhum chat encontrado. Confirme que o bot foi adicionado como admin do grupo/canal e que alguém mandou uma mensagem recente lá (o Telegram só guarda updates por um tempo limitado).",
    );
    return;
  }

  console.log("Chats encontrados:\n");
  for (const [chatId, label] of seen) {
    console.log(`chat_id: ${chatId}\n  ${label}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
