import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const passwordHash = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Admin", role: "ADMIN", passwordHash },
    update: { passwordHash },
  });

  console.log(`Usuário admin pronto: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
