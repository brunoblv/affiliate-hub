import { PageHeader } from "@/components/admin/page-header";
import { LarSmartWizard } from "@/components/admin/larsmart-wizard";

export const maxDuration = 180;

export default function LarSmartPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="LarSmart"
        description="Digite a ideia do artigo: o sistema escolhe os produtos (catálogo interno, com fallback pra Shopee), escreve o texto pelo Gemini e gera uma imagem de ambiente por produto. Sai como rascunho pra revisão."
      />
      <LarSmartWizard />
    </div>
  );
}
