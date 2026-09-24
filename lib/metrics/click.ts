/** Pré-carregamentos e HEAD não demonstram clique. GET comum ainda pode incluir robôs. */
export function countClick(request: Request): boolean {
  return request.method === "GET"
    && !request.headers.has("next-router-prefetch")
    && !/prefetch|prerender/i.test(`${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`);
}
