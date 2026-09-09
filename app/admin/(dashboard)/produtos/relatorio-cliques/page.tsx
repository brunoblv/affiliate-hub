import { PageHeader } from "@/components/admin/page-header";
import { RelatorioCliquesForm } from "@/components/admin/relatorio-cliques-form";

export default function RelatorioCliquesShopeePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Cliques Shopee"
        description="Sem API pra isso — cole a planilha exportada do painel de afiliados e eu decodifico rede, canal e produto pelo sub-id."
      />
      <RelatorioCliquesForm />
    </div>
  );
}
