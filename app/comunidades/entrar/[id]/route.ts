import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countClick } from "@/lib/metrics/click";
import { communityInvite } from "@/lib/communities/validation";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const community = await prisma.community.findUnique({ where: { id }, include: { niche: true } });
  const invite = community && community.active && community.niche.active
    ? communityInvite(community.inviteUrl, community.platform, community.kind) : null;
  const response = NextResponse.redirect(invite ?? new URL("/comunidades?indisponivel=1", request.url), 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (!invite || !community) return response;
  let source: string | null = null;
  try {
    const referrer = new URL(request.headers.get("referer") ?? "");
    if (referrer.origin === new URL(request.url).origin) source = referrer.pathname.slice(0, 512);
  } catch { /* Origem desconhecida: não inventar atribuição. */ }
  if (countClick(request)) after(async () => {
    try { await prisma.communityClick.create({ data: { communityId: id, nicheId: community.nicheId, source } }); }
    catch { console.error("[comunidade] falha ao registrar clique"); }
  });
  return response;
}

// Checagens de link e prefetch não representam cliques de entrada.
export function HEAD() { return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }); }
