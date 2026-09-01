import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { PainelBuscaShopee } from "@/components/admin/painel-busca-shopee";
import { BuscarShopeeForm } from "@/components/admin/buscar-shopee-form";
import { buscarOfertasShopeeAction, importarShopeeAction } from "../actions";

export const maxDuration = 120;

export default function BuscarShopeeProdutoPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Buscar por cômodo"
        description="Escolha quarto, sala, cozinha, jardim, banheiro… o algoritmo puxa só promoção ou bom preço. Você marca o que quer salvar no catálogo."
      />

      <PainelBuscaShopee />

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Busca livre por palavra-chave</summary>
        <div className="mt-4">
          <BuscarShopeeForm buscarAction={buscarOfertasShopeeAction} importarAction={importarShopeeAction} />
        </div>
      </details>

      <Link href="/admin/produtos/importar-shopee" className="block text-sm text-muted-foreground hover:underline">
        Já tem o link do produto? Importar direto
      </Link>
    </div>
  );
}
