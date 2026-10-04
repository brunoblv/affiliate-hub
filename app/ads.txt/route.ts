/**
 * /ads.txt (§39). Só responde quando o ID de publisher do AdSense estiver
 * configurado; antes disso, 404 — um ads.txt com ID falso seria pior que nenhum.
 */
export function GET() {
  const publisherId = process.env.ADSENSE_PUBLISHER_ID?.trim();
  if (!publisherId || !/^pub-\d{10,20}$/.test(publisherId)) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
