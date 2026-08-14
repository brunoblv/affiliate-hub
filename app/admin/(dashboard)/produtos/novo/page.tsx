import { PageHeader } from "@/components/admin/page-header";
import { ProdutoForm } from "@/components/admin/produto-form";
import { createProdutoAction } from "../actions";

export default function NovoProdutoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Novo produto" description="Cadastro manual — nome, preço, imagens e link de afiliado." />
      <ProdutoForm action={createProdutoAction} />
    </div>
  );
}
