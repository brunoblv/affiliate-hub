import { createHmac } from "node:crypto";

/**
 * Algoritmo de assinatura do TikTok Shop Open API (esquema estável usado em
 * todas as versões da Partner API): concatena o path + parâmetros de query
 * ordenados alfabeticamente (exceto `sign` e `access_token`) + corpo (quando
 * não for multipart/form-data), envolve com o app_secret nas duas pontas e
 * aplica HMAC-SHA256 usando o app_secret como chave.
 *
 * Ver: https://partner.tiktokshop.com/docv2 (seção de assinatura de requisições).
 * Se a API retornar erro de assinatura, confira o path exato usado na conta
 * (com ou sem prefixo de versão) na Partner Center antes de mais nada.
 */
export function signRequest(params: {
  path: string;
  query: Record<string, string | number | undefined>;
  body?: unknown;
  appSecret: string;
  isMultipart?: boolean;
}): string {
  const { path, query, body, appSecret, isMultipart } = params;

  const sortedEntries = Object.entries(query)
    .filter(([key, value]) => value !== undefined && key !== "sign" && key !== "access_token")
    .sort(([a], [b]) => a.localeCompare(b));

  let base = path;
  for (const [key, value] of sortedEntries) {
    base += `${key}${value}`;
  }

  if (!isMultipart && body !== undefined) {
    base += JSON.stringify(body);
  }

  const wrapped = `${appSecret}${base}${appSecret}`;

  return createHmac("sha256", appSecret).update(wrapped).digest("hex");
}
