"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm({ callbackUrl, error }: { callbackUrl?: string; error?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(
    error === "AccessDenied"
      ? "Esta conta Google não tem acesso."
      : error
        ? "Credenciais inválidas. Tente novamente."
        : null,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError("Credenciais inválidas. Tente novamente.");
        return;
      }

      router.push(callbackUrl || "/admin");
      router.refresh();
    });
  }

  function handleGoogleSignIn() {
    setFormError(null);
    startTransition(async () => {
      await signIn("google", { callbackUrl: callbackUrl || "/admin" });
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Affiliate Manager</CardTitle>
        <CardDescription>Entre com sua conta administrativa</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.89c2.28-2.1 3.56-5.2 3.56-8.81Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.89-3c-1.08.73-2.46 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.3 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.3v-3.1H1.28A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.1Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.6l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
            />
          </svg>
          Entrar com Google
        </Button>
      </CardContent>
    </Card>
  );
}
