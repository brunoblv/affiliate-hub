import { createHash } from "node:crypto";
import { registrar } from "@/lib/log";
import { getRateLimiter } from "@/lib/integrations/rate-limiter";

const API_URL = "https://open-api.affiliate.shopee.com.br/graphql";

/** Conservador — a Shopee não documenta o limite publicamente. */
const rateLimiter = getRateLimiter("shopee", 5, 1_000);

function getCredentials(): { appId: string; secret: string } {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;
  if (!appId || !secret) {
    throw new Error("Shopee não configurado. Defina SHOPEE_APP_ID e SHOPEE_SECRET no .env antes de chamar a API.");
  }
  return { appId, secret };
}

/** SHA256(AppId + Timestamp + Payload + Secret) — esquema de assinatura da Affiliate Open API. */
function assinar(appId: string, timestamp: number, payload: string, secret: string): string {
  return createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
}

interface GraphQLErro {
  message: string;
  [key: string]: unknown;
}

interface GraphQLResposta<T> {
  data?: T;
  errors?: GraphQLErro[];
}

/** Chamada assinada ao endpoint GraphQL único da Shopee Affiliate Open API. */
export async function shopeeRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { appId, secret } = getCredentials();
  await rateLimiter.acquire();

  const payload = JSON.stringify({ query, variables });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = assinar(appId, timestamp, payload, secret);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
  });

  const json = (await response.json()) as GraphQLResposta<T>;

  if (!response.ok || json.errors?.length) {
    await registrar("ERRO", "PRODUTO_SYNC", "Shopee: chamada à API falhou", {
      status: response.status,
      erros: json.errors,
    });
    throw new Error(`Shopee API error: ${json.errors?.map((e) => e.message).join("; ") ?? response.statusText}`);
  }

  if (!json.data) {
    throw new Error("Shopee API: resposta sem `data`.");
  }

  return json.data;
}
