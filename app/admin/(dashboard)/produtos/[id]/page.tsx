import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { ProdutoForm } from "@/components/admin/produto-form";
import { DistribuirProdutoButton } from "@/components/admin/distribuir-produto-button";
import { updateProdutoAction, distribuirProdutoAction } from "../actions";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) notFound();

  const action = updateProdutoAction.bind(null, id);
  const distribuir = distribuirProdutoAction.bind(null, id);

  return (
    <div className="space-y-8">
      <PageHeader title={produto.nome} description={`/go/${produto.codigoCurto}`} />
      <ProdutoForm produto={produto} action={action} />
      <div className="max-w-2xl border-t border-border pt-6">
        <h2 className="text-sm font-medium">Distribuição</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agenda o produto nos canais ativos, respeitando horários, cooldown e teto diário de cada um.
        </p>
        <div className="mt-3">
          <DistribuirProdutoButton action={distribuir} />
        </div>
      </div>
    </div>
  );
}
