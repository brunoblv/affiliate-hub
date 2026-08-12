import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTikTokTokens } from "@/lib/tiktok/credentials";
import { ensureMetaPagesFromEnv, getMetaTokens } from "@/lib/meta";
import { metaUserTokenConfigured } from "@/lib/meta/user-token-env";
import { getMercadoLivreTokens } from "@/lib/mercado-livre/credentials";

const INTEGRATIONS = [
  { name: "Shopee Afiliados", envVars: ["SHOPEE_APP_ID", "SHOPEE_SECRET"] },
  { name: "Instagram (app dedicado)", envVars: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"] },
];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tiktok?: string; meta?: string; ml?: string }>;
}) {
  const params = await searchParams;

  const tiktokConfigured = Boolean(
    process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_SERVICE_ID,
  );
  const tiktokTokens = tiktokConfigured ? await getTikTokTokens() : null;

  const metaConfigured = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
  const metaEnvToken = metaUserTokenConfigured();
  // Com META_USER_TOKEN, as páginas sobem sozinhas (sem botão Conectar).
  const metaTokens = metaConfigured
    ? ((metaEnvToken ? await ensureMetaPagesFromEnv() : null) ?? (await getMetaTokens()))
    : null;
  const metaReady = Boolean(metaTokens?.pages.length);

  const mlConfigured = Boolean(process.env.MERCADOLIVRE_CLIENT_ID && process.env.MERCADOLIVRE_CLIENT_SECRET);
  const mlTokens = mlConfigured ? await getMercadoLivreTokens() : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" description="Status de configuração das integrações externas" />

      {params.tiktok === "connected" && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          Conta TikTok Shop conectada com sucesso.
        </p>
      )}
      {params.tiktok === "error" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Não foi possível conectar a conta TikTok Shop. Veja os Logs para detalhes.
        </p>
      )}
      {params.meta === "connected" && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          Conta Meta conectada com sucesso.
        </p>
      )}
      {params.meta === "error" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Não foi possível conectar a conta Meta. Veja os Logs para detalhes.
        </p>
      )}
      {params.ml === "connected" && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          Conta Mercado Livre conectada com sucesso.
        </p>
      )}
      {params.ml === "error" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Não foi possível conectar a conta Mercado Livre. Veja os Logs para detalhes.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">TikTok Shop</CardTitle>
            <Badge variant={tiktokTokens ? "default" : "outline"}>
              {tiktokTokens ? "Conectado" : tiktokConfigured ? "Chaves ok, conta não conectada" : "Pendente"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_SERVICE_ID</p>
            {!process.env.TIKTOK_SERVICE_ID && process.env.TIKTOK_CLIENT_KEY && (
              <p className="text-destructive">
                Falta TIKTOK_SERVICE_ID — copie do link de autorização no Partner Center (não use o App Key).
              </p>
            )}
            {tiktokTokens?.sellerName && <p>Vendedor: {tiktokTokens.sellerName}</p>}
            {tiktokConfigured && (
              <Link
                href="/api/integrations/tiktok/authorize"
                className={cn(buttonVariants({ variant: tiktokTokens ? "outline" : "default", size: "sm" }))}
              >
                {tiktokTokens ? "Reconectar conta" : "Conectar TikTok"}
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Meta (Facebook / Instagram)</CardTitle>
            <Badge variant={metaReady ? "default" : "outline"}>
              {metaReady
                ? metaEnvToken
                  ? "Pronto via .env"
                  : "Pronto"
                : metaConfigured
                  ? metaEnvToken
                    ? "Token no .env, páginas pendentes"
                    : "Falta META_USER_TOKEN"
                  : "Pendente"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>META_APP_ID, META_APP_SECRET, META_USER_TOKEN</p>
            <p>Páginas publicam com o token do .env. Não é necessário clicar em Conectar.</p>
            {metaReady && <p>{metaTokens!.pages.length} página(s) pronta(s)</p>}
            {metaTokens?.pages.map((page) => (
              <p key={page.id}>
                {page.name}: {page.id}
              </p>
            ))}
            {metaConfigured && !metaEnvToken && (
              <p className="text-destructive">
                Defina META_USER_TOKEN no .env (user token de um admin das Páginas).
              </p>
            )}
            {metaConfigured && !metaEnvToken && (
              <Link
                href="/api/integrations/meta/authorize"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Alternativa: OAuth no browser
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mercado Livre</CardTitle>
            <Badge variant={mlTokens ? "default" : "outline"}>
              {mlTokens ? "Conectado" : mlConfigured ? "Chaves ok, conta não conectada" : "Pendente"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>MERCADOLIVRE_CLIENT_ID, MERCADOLIVRE_CLIENT_SECRET</p>
            {mlTokens && <p>user_id: {mlTokens.userId}</p>}
            <p className="text-[11px]">Só consulta/busca de produtos — geração de link permanece manual (Portal de Afiliados).</p>
            {mlConfigured && (
              <Link
                href="/api/integrations/mercado-livre/authorize"
                className={cn(buttonVariants({ variant: mlTokens ? "outline" : "default", size: "sm" }))}
              >
                {mlTokens ? "Reconectar conta" : "Conectar Mercado Livre"}
              </Link>
            )}
          </CardContent>
        </Card>

        {INTEGRATIONS.map((integration) => {
          const configured = integration.envVars.every((key) => Boolean(process.env[key]));
          return (
            <Card key={integration.name}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <Badge variant={configured ? "default" : "outline"}>
                  {configured ? "Configurado" : "Pendente"}
                </Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {integration.envVars.join(", ")}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
