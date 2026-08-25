import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { ImportarShopeeForm } from "@/components/admin/importar-shopee-form";
import { importarShopeeAction } from "../actions";

export default function ImportarShopeeProdutoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar da Shopee"
        description="Cola o link do produto. Preço, nome, imagem e link de afiliado são resolvidos automaticamente."
      />

      <ImportarShopeeForm action={importarShopeeAction} />

      <Link href="/admin/produtos/buscar-shopee" className="block text-sm text-muted-foreground hover:underline">
        Prefere buscar por palavra-chave?
      </Link>
    </div>
  );
}
