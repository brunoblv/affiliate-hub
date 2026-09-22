import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Só servidor: o adapter `pg` usa dns/net/fs/tls.

declare global {
  var __prisma: PrismaClient | undefined;
}

// Sessão em UTC: o adapter serializa Date sem offset e o Postgres o interpreta
// no TimeZone da sessão.
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=UTC",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
