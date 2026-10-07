/**
 * Chamada real e assinada à Affiliate API do AliExpress, sem tocar no banco.
 *   npm run aliexpress:verify -- 1005006123456789
 *   npm run aliexpress:verify -- https://pt.aliexpress.com/item/1005006123456789.html
 * Sem argumento, usa um item qualquer da busca (product.query) para validar as credenciais.
 */
import "dotenv/config";
import { aliExpressConnector, parseAliExpressUrl, signAliExpress } from "@/lib/connectors/aliexpress";

const API_URL = "https://api-sg.aliexpress.com/sync";

async function firstProductFromQuery(appKey: string, secret: string): Promise<string | null> {
  const params: Record<string, string> = {
    app_key: appKey,
    method: "aliexpress.affiliate.product.query",
    sign_method: "sha256",
    timestamp: String(Date.now()),
    keywords: "organizador cozinha",
    target_currency: "BRL",
    target_language: "PT",
    ship_to_country: "BR",
    page_size: "1",
  };
  if (process.env.ALIEXPRESS_TRACKING_ID) params.tracking_id = process.env.ALIEXPRESS_TRACKING_ID;
  params.sign = signAliExpress(params, secret);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as Record<string, any>;
  if (json.error_response || (json.code && json.code !== "0")) {
    console.error(`product.query: erro ${json.error_response?.code ?? json.code} — ${json.error_response?.msg ?? json.message}`);
    return null;
  }
  const result = json.aliexpress_affiliate_product_query_response?.resp_result;
  const product = result?.result?.products?.product?.[0];
  if (!product) {
    console.error(`product.query: sem resultados (resp_code=${result?.resp_code} ${result?.resp_msg ?? ""})`);
    return null;
  }
  return String(product.product_id);
}

async function main() {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secret = process.env.ALIEXPRESS_APP_SECRET;
  if (!appKey || !secret) {
    console.error("Defina ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET no .env.");
    process.exitCode = 1;
    return;
  }
  console.log(`App key: ${appKey} | tracking ID: ${process.env.ALIEXPRESS_TRACKING_ID ? "definido" : "VAZIO (sem link de afiliado)"}`);

  const arg = process.argv[2];
  const listingId = arg ? parseAliExpressUrl(arg)?.listingId : await firstProductFromQuery(appKey, secret);
  if (!listingId) {
    if (arg) console.error(`Não reconheci "${arg}" como ID ou URL de item do AliExpress.`);
    process.exitCode = 1;
    return;
  }

  const result = await aliExpressConnector.fetchOffer({ externalListingId: listingId, externalSellerId: null, originalUrl: null });
  if (result.kind === "not_found") {
    console.log(`Item ${listingId}: não encontrado (pode estar fora do programa de afiliados). Credenciais OK.`);
    return;
  }
  console.log(`Item ${listingId}: OK (sem access_token)`);
  console.log(`  título:  ${result.title}`);
  console.log(`  preço:   R$ ${(result.priceCents / 100).toFixed(2)}${result.previousPriceCents ? ` (de R$ ${(result.previousPriceCents / 100).toFixed(2)})` : ""}`);
  console.log(`  loja:    ${result.sellerName ?? "-"}`);
  console.log(`  fotos:   ${result.imageUrls?.length ?? 0}`);
  console.log(`  link:    ${result.affiliateUrl ?? "(nenhum — falta ALIEXPRESS_TRACKING_ID)"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
