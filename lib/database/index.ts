export { prisma } from "./client";
export * from "./enums";
// Só tipos: o client gerado importa `node:path`/`node:url` e não pode ir
// para o bundle do browser. Valores de enum saem de `./enums`.
export type * from "@/lib/generated/prisma/client";
