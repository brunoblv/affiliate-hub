import { createHash } from "node:crypto";
import { prisma } from "@/lib/database";
import { logger } from "@/lib/logging";

export interface RegisterClickInput {
  shortCode: string;
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}

/** Hash irreversível do IP — evita armazenar dado pessoal diretamente (spec §11). */
function hashIp(ip: string): string {
  const salt = process.env.CLICK_IP_HASH_SALT ?? "affiliate-manager";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Registra o clique em um AffiliateLink e retorna a URL de destino para
 * redirecionamento. Usado pela rota /go/[code] (spec §11).
 */
export async function registerClick(input: RegisterClickInput): Promise<string | null> {
  const link = await prisma.affiliateLink.findUnique({ where: { shortCode: input.shortCode } });
  if (!link) return null;

  await prisma.$transaction([
    prisma.click.create({
      data: {
        affiliateLinkId: link.id,
        ipHash: input.ip ? hashIp(input.ip) : undefined,
        userAgent: input.userAgent ?? undefined,
        referer: input.referer ?? undefined,
      },
    }),
    prisma.affiliateLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }),
  ]);

  logger.info("AFFILIATE_SYNC", "Clique registrado", { shortCode: input.shortCode, linkId: link.id });

  return link.affiliateUrl;
}
