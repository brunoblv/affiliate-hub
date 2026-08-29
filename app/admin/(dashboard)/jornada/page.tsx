import { NotebookPen } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { NotaJornadaForm } from "@/components/admin/nota-jornada-form";
import { ExcluirNotaJornadaButton } from "@/components/admin/excluir-nota-jornada-button";

export default async function JornadaAdminPage() {
  const notas = await prisma.notaJornada.findMany({ orderBy: { criadoEm: "desc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Minha jornada"
        description="Blocos de texto livre sobre a sua jornada real de compra e mudança para o apartamento. A IA usa isso como contexto para escrever os artigos da categoria &quot;Jornada de compra de apartamento&quot; com fatos reais, em vez de inventar."
      />

      <NotaJornadaForm />

      {notas.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nenhum bloco ainda"
          description="Adicione o primeiro relato pelo formulário acima."
        />
      ) : (
        <ul className="space-y-3">
          {notas.map((nota) => (
            <li key={nota.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <p className="whitespace-pre-wrap text-sm">{nota.texto}</p>
                <p className="text-xs text-muted-foreground">{nota.criadoEm.toLocaleString("pt-BR")}</p>
              </div>
              <ExcluirNotaJornadaButton id={nota.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
