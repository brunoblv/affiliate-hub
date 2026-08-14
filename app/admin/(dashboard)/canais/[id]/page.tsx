import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { CanalForm } from "@/components/admin/canal-form";
import { TestarConexaoButton } from "@/components/admin/testar-conexao-button";
import { updateCanalAction, testarConexaoAction } from "../actions";

export default async function EditarCanalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const canal = await prisma.canal.findUnique({ where: { id } });
  if (!canal) notFound();

  const action = updateCanalAction.bind(null, id);
  const testar = testarConexaoAction.bind(null, id);

  return (
    <div className="space-y-8">
      <PageHeader title={canal.nome} description={canal.rede} />
      <CanalForm canal={canal} action={action} />
      <div className="max-w-xl border-t border-border pt-6">
        <h2 className="text-sm font-medium">Teste de conexão</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Publica uma mensagem curta de teste no canal — cuidado, isso posta de verdade.
        </p>
        <div className="mt-3">
          <TestarConexaoButton action={testar} />
        </div>
      </div>
    </div>
  );
}
