import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { decryptJson } from "../lib/integrations/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const rows = await prisma.metaFacebookPage.findMany({ orderBy: { name: "asc" } });
  if (rows.length === 0) {
    console.log("Nenhuma página em meta_facebook_pages.");
    return;
  }

  for (const row of rows) {
    let status = "token_BAD";
    let len = 0;
    try {
      const token = decryptJson<string>(row.accessToken);
      if (typeof token === "string" && token.startsWith("EAA")) {
        status = "token_ok";
        len = token.length;
      }
    } catch {
      status = "decrypt_fail";
    }
    console.log(
      `${row.name} | pageId=${row.pageId} | active=${row.active} | ${status} | len=${len}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
