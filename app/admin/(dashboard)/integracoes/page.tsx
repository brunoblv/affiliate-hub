import { getMercadoLivreTokens } from "@/lib/mercado-livre/credentials";
import { listarPaginasMeta } from "@/lib/meta/credentials";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReconectarMetaButton } from "@/components/admin/reconectar-meta-button";

export default async function IntegracoesPage() {
  const [mercadoLivre, paginasMeta] = await Promise.all([getMercadoLivreTokens(), listarPaginasMeta()]);
  const telegramConfigurado = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const shopeeConfigurado = Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_SECRET);

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" description="Status dos tokens de cada plataforma." />

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

        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">Meta (Facebook / Instagram)</div>
            <div className="text-xs text-muted-foreground">
              {paginasMeta.length > 0 ? `${paginasMeta.length} página(s): ${paginasMeta.map((p) => p.nome).join(", ")}` : "Nenhuma página sincronizada ainda."}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={paginasMeta.length > 0 ? "default" : "secondary"}>
              {paginasMeta.length > 0 ? "Conectado" : "Desconectado"}
            </Badge>
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
