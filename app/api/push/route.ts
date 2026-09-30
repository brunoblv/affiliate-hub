import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pushConfig } from "@/lib/push/config";
import { parseSubscription, sameOrigin, validEndpoint } from "@/lib/push/validation";

export const runtime = "nodejs";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = (await auth())?.user;
  if (!user?.id) return json({ error: "Entre na sua conta." }, 401);
  const config = pushConfig();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id }, select: { endpoint: true,
    _count: { select: { deliveries: { where: { status: { in: ["FAILED", "UNCERTAIN"] } } } } } } });
  return json({ publicKey: config?.publicKey ?? null, endpoints: subscriptions.map((s) => s.endpoint),
    issues: subscriptions.filter((s) => s._count.deliveries > 0).map((s) => s.endpoint) });
}

async function mutate(request: Request, remove: boolean) {
  if (!sameOrigin(request)) return json({ error: "Origem inválida." }, 403);
  const user = (await auth())?.user;
  if (!user?.id) return json({ error: "Entre na sua conta." }, 401);
  if (Number(request.headers.get("content-length")) > 8192) return json({ error: "Dados muito grandes." }, 413);
  const raw = await request.text();
  if (raw.length > 8192) return json({ error: "Dados muito grandes." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "Dados inválidos." }, 400); }
  if (remove) {
    if (!validEndpoint(body?.endpoint)) return json({ error: "Dispositivo inválido." }, 400);
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: body.endpoint } });
    return json({ ok: true });
  }
  if (!pushConfig()) return json({ error: "Push ainda não configurado." }, 503);
  const subscription = parseSubscription(body);
  if (!subscription) return json({ error: "Inscrição do navegador inválida ou não suportada." }, 400);
  // Nunca transferir silenciosamente uma inscrição de outra conta neste navegador.
  try {
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint } });
    if (existing) {
      if (existing.userId !== user.id || existing.p256dh !== subscription.p256dh || existing.auth !== subscription.auth)
        return json({ error: "Este navegador está vinculado a outra inscrição. Renove a permissão do site e tente novamente." }, 409);
      return json({ ok: true });
    }
    await prisma.pushSubscription.create({ data: { ...subscription, userId: user.id } });
    return json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002")
      return json({ error: "A inscrição mudou. Recarregue e tente novamente." }, 409);
    throw error;
  }
}

export const POST = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
