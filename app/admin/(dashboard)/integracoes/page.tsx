import { getMercadoLivreTokens } from "@/lib/mercado-livre/credentials";
import { listarPaginasMeta } from "@/lib/meta/credentials";
import { metaOAuthConfigurado } from "@/lib/meta/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReconectarMetaButton } from "@/components/admin/reconectar-meta-button";

const MENSAGEM_META: Record<string, { ok: boolean; texto: string }> = {
  connected: { ok: true, texto: "Meta reconectada. Páginas sincronizadas." },
  denied: { ok: false, texto: "Autorização da Meta cancelada. Sem isso, não dá para publicar no Facebook/Instagram." },
  error: {
    ok: false,
    texto: "Falha ao reconectar a Meta. Confira se NEXT_PUBLIC_SITE_URL (ou META_REDIRECT_URI) é HTTPS e se essa mesma URI está em Valid OAuth Redirect URIs no app da Meta.",
  },
};

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string }>;
}) {
  const { meta } = await searchParams;
  const avisoMeta = meta ? MENSAGEM_META[meta] : undefined;

  const [mercadoLivre, paginasMeta] = await Promise.all([getMercadoLivreTokens(), listarPaginasMeta()]);
  const telegramConfigurado = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const shopeeConfigurado = Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_SECRET);
  const metaOAuth = metaOAuthConfigurado();

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" description="Status dos tokens de cada plataforma." />

      {avisoMeta && (
        <p className={`text-sm ${avisoMeta.ok ? "text-muted-foreground" : "text-destructive"}`}>{avisoMeta.texto}</p>
      )}

      <div className="max-w-2xl divide-y divide-border rounded-lg border border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">Mercado Livre</div>
            <div className="text-xs text-muted-foreground">Usado para importar produtos por ID.</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={mercadoLivre ? "default" : "secondary"}>{mercadoLivre ? "Conectado" : "Desconectado"}</Badge>
            <Button size="sm" variant="outline" render={<a href="/api/integrations/mercado-livre/authorize" />}>
              {mercadoLivre ? "Reconectar" : "Conectar"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="font-medium">Meta (Facebook / Instagram)</div>
            <div className="text-xs text-muted-foreground">
              {paginasMeta.length > 0
                ? `${paginasMeta.length} página(s): ${paginasMeta.map((p) => p.nome).join(", ")}`
                : "Nenhuma página sincronizada ainda."}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge variant={paginasMeta.length > 0 ? "default" : "secondary"}>
              {paginasMeta.length > 0 ? "Conectado" : "Desconectado"}
            </Badge>
            {metaOAuth ? (
              <Button size="sm" variant="outline" render={<a href="/api/integrations/meta/authorize" />}>
                {paginasMeta.length > 0 ? "Reconectar" : "Conectar"}
              </Button>
            ) : null}
            <ReconectarMetaButton />
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">Shopee</div>
            <div className="text-xs text-muted-foreground">
              Usado para buscar ofertas e gerar link de afiliado. Configurado via SHOPEE_APP_ID/SHOPEE_SECRET no .env.
            </div>
          </div>
          <Badge variant={shopeeConfigurado ? "default" : "secondary"}>
            {shopeeConfigurado ? "Configurado" : "Não configurado"}
          </Badge>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">Telegram</div>
            <div className="text-xs text-muted-foreground">Bot configurado via TELEGRAM_BOT_TOKEN no .env.</div>
          </div>
          <Badge variant={telegramConfigurado ? "default" : "secondary"}>
            {telegramConfigurado ? "Configurado" : "Não configurado"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
