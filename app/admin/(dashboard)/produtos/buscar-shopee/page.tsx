import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { BuscarShopeeForm } from "@/components/admin/buscar-shopee-form";
import { buscarOfertasShopeeAction, importarShopeeAction } from "../actions";

export default function BuscarShopeeProdutoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buscar ofertas na Shopee"
        description="Busca por palavra-chave e importa com um clique — preço, imagem e link de afiliado vêm prontos."
      />

      <BuscarShopeeForm buscarAction={buscarOfertasShopeeAction} importarAction={importarShopeeAction} />

      <Link href="/admin/produtos/importar-shopee" className="block text-sm text-muted-foreground hover:underline">
        Já tem o link do produto? Importar direto
      </Link>
    </div>
  );
}
