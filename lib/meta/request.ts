import { GRAPH_API_BASE_URL } from "./graph-version";
import { logger } from "@/lib/logging";

interface GraphErrorBody {
  error?: { message: string; type?: string; code?: number };
}

/** Chamada genérica à Graph API, já tratando erros no formato padrão da Meta. */
export async function graphRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    accessToken: string;
    params?: Record<string, string | number | boolean | undefined>;
  },
): Promise<T> {
  const { method = "GET", accessToken, params = {} } = options;

  const url = new URL(`${GRAPH_API_BASE_URL}${path}`);
  const isGet = method === "GET";

  const searchParams = { ...params, access_token: accessToken };
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { method: isGet ? "GET" : method });
  const json = (await response.json()) as T & GraphErrorBody;

  if (!response.ok || json.error) {
    logger.error("PUBLISH", `Meta: chamada a ${path} falhou`, { status: response.status, error: json.error });
    throw new Error(`Meta Graph API error em ${path}: ${json.error?.message ?? response.statusText}`);
  }

  return json;
}
