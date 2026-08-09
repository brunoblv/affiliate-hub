import { PageHeader } from "@/components/admin/page-header";
import { UmbandaSubnav } from "@/components/admin/umbanda-subnav";

export default function UmbandaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Afiliados — Umbanda"
        description="Operação de afiliados de Umbanda e espiritualidade, separada do projeto Meu Novo Lar."
      />
      <UmbandaSubnav />
      {children}
    </div>
  );
}
