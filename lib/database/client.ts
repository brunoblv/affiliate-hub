import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Este módulo é só servidor: o adapter `pg` usa dns/net/fs/tls.

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * A sessão TEM que abrir em UTC. O adapter serializa `Date` como texto sem
 * offset (as partes UTC do instante), e o Postgres interpreta esse texto no
 * `TimeZone` da sessão. Com o servidor em America/Sao_Paulo, gravar
 * 22:12 UTC virava 22:12 BRT = 01:12 UTC — todo `agendadaPara` nascia 3h
 * adiantado. A leitura desfazia o desvio, então o app "parecia" certo, mas o
 * SQL cru (`agendadaPara <= now()`, filtro de janela 09:00–21:00) via a hora
 * errada: nada era reivindicado no horário e o reagendador empurrava a fila
 * inteira para o dia seguinte, em loop. Nada era publicado.
 */
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
