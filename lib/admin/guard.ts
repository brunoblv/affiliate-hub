import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** O proxy já barra /admin, mas server actions são endpoints POST: validar de novo. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/entrar?callbackUrl=/admin");
  return session.user;
}
