import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { PainelMaisVendidos } from "@/components/admin/painel-mais-vendidos";

export const maxDuration = 120;

export default function MaisVendidosPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mais vendidos por categoria"
        description="Escolhe a categoria e traz os itens mais vendidos da Shopee (sortType Most Sold) — você decide o que entra no catálogo."
      />

      <PainelMaisVendidos />

      <Link href="/admin/produtos/buscar-shopee" className="block text-sm text-muted-foreground hover:underline">
        Prefere buscar por cômodo?
      </Link>
    </div>
  );
}
