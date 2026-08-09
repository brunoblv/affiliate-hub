import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <LoginForm callbackUrl={params.callbackUrl} error={params.error} />
    </div>
  );
}
