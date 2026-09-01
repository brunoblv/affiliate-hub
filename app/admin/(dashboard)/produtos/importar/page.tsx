import Link from "next/link";
import { getMercadoLivreTokens } from "@/lib/mercado-livre/credentials";
import { PageHeader } from "@/components/admin/page-header";
import { ImportarMercadoLivreForm } from "@/components/admin/importar-mercado-livre-form";
import { Button } from "@/components/ui/button";
import { importarMercadoLivreAction } from "../actions";

export const maxDuration = 60;

export default async function ImportarProdutoPage() {
  const conectado = Boolean(await getMercadoLivreTokens());

  return (
    <div className="space-y-6">
      <PageHeader title="Importar do Mercado Livre" description="Cola o ID do anúncio + link de afiliado. Rascunho pronto em segundos." />

      {!conectado ? (
        <div className="max-w-lg rounded-lg border border-border p-4 text-sm">
          <p className="text-muted-foreground">Conecte sua conta do Mercado Livre antes de importar.</p>
          <Button className="mt-3" render={<a href="/api/integrations/mercado-livre/authorize" />}>
            Conectar Mercado Livre
          </Button>
        </div>
      ) : (
        <ImportarMercadoLivreForm action={importarMercadoLivreAction} />
      )}

      <Link href="/admin/produtos/novo" className="block text-sm text-muted-foreground hover:underline">
        Prefere cadastrar manualmente?
      </Link>
    </div>
  );
}
