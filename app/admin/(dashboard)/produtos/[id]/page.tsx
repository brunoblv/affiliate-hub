import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { ProdutoForm } from "@/components/admin/produto-form";
import { DistribuirProdutoButton } from "@/components/admin/distribuir-produto-button";
import { PublicarAgoraProduto } from "@/components/admin/publicar-agora-produto";
import { updateProdutoAction } from "../actions";

const LABEL_DESTINO: Record<string, string> = {
  MEU_NOVO_LAR: "Meu Novo Lar",
  TIKTOK_SHOP: "TikTok Shop",
  UMBANDA: "Umbanda",
};

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) notFound();

  const canaisAtivos = await prisma.canal.findMany({
    where: { ativo: true, destino: produto.destino },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const action = updateProdutoAction.bind(null, id);
  const produtoSerializado = {
    ...produto,
    precoAtual: Number(produto.precoAtual),
    precoOriginal: produto.precoOriginal ? Number(produto.precoOriginal) : null,
  };

  return (
    <div className="space-y-8">
      <PageHeader title={produto.nome} description={`/go/${produto.codigoCurto}`} />
      <ProdutoForm produto={produtoSerializado} action={action} />
      <div className="max-w-2xl border-t border-border pt-6">
        <h2 className="text-sm font-medium">Distribuição</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agenda o produto nos canais ativos do mesmo destino ({LABEL_DESTINO[produto.destino] ?? produto.destino}),
          respeitando horários, cooldown e teto diário de cada um.
          {produto.destino === "TIKTOK_SHOP" || produto.plataforma === "TIKTOK_SHOP"
            ? " Produto TikTok Shop entra na fila uma única vez."
            : null}
        </p>
        <div className="mt-3">
          <DistribuirProdutoButton produtoId={id} />
        </div>
      </div>
      <div className="max-w-2xl border-t border-border pt-6">
        <h2 className="text-sm font-medium">Publicar agora</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Publica de imediato em um canal específico, ignorando horários e teto diário (cooldown continua valendo).
        </p>
        <div className="mt-3">
          <PublicarAgoraProduto produtoId={id} canais={canaisAtivos} />
        </div>
      </div>
    </div>
  );
}
