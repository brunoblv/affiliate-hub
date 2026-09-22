import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl?.startsWith("/") ? callbackUrl : "/conta";

  if ((await auth())?.user) redirect(destination);

  return (
    <main id="conteudo" className="mx-auto flex max-w-[420px] flex-col gap-6 px-4 py-24">
      <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">Entrar</h1>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: destination });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-[10px] border border-line bg-surface px-4 py-3 text-sm font-semibold hover:border-brand"
        >
          Continuar com Google
        </button>
      </form>
    </main>
  );
}
