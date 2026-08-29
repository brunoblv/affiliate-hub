/**
 * Enums do Prisma, sem o PrismaClient nem o adapter `pg`.
 * Componentes de cliente devem importar daqui (ou de `@/lib/produtos`), nunca
 * de `./client` / `@/lib/database` — o barrel do banco puxa Node (`dns`/`net`/`fs`).
 */
export * from "@/lib/generated/prisma/enums";
