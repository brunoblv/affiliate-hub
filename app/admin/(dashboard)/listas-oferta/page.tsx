import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ListaOfertaForm } from "@/components/admin/lista-oferta-form";
import { ListasOfertaTabela } from "@/components/admin/listas-oferta-tabela";
import { AgendarListasOfertaDoDiaButton } from "@/components/admin/agendar-listas-oferta-do-dia-button";
import { PainelCampanhasShopee } from "@/components/admin/painel-campanhas-shopee";
import { atualizarListaOfertaAction, criarListaOfertaAction } from "./actions";

export const maxDuration = 60;

export default async function ListasOfertaPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const { editar } = await searchParams;
  const [listas, editando] = await Promise.all([
    prisma.listaOferta.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        titulo: true,
        categoria: true,
        plataforma: true,
        destino: true,
        redes: true,
        ativo: true,
        divulgarDiario: true,
        textoPinterest: true,
        linkAfiliado: true,
      },
    }),
    editar
      ? prisma.listaOferta.findUnique({
          where: { id: editar },
          select: {
            id: true,
            titulo: true,
            plataforma: true,
            categoria: true,
            destino: true,
            redes: true,
            linkAfiliado: true,
            ativo: true,
            divulgarDiario: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Listas da loja"
          description="Cadastre o link de afiliado de uma lista pronta (Shopee Oferta Shopee, coleção do Mercado Livre). O post diz que é uma lista de ofertas e sai todo dia nos destinos marcados."
        />
        <AgendarListasOfertaDoDiaButton />
      </div>

      <section className="max-w-2xl space-y-3 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold">{editando ? "Editar lista" : "Nova lista"}</h2>
        <ListaOfertaForm
          key={editando?.id ?? "nova"}
          lista={editando ?? undefined}
          action={
            editando
              ? atualizarListaOfertaAction.bind(null, editando.id)
              : criarListaOfertaAction
          }
        />
      </section>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Importar campanha da Shopee (Oferta Shopee)</summary>
        <div className="mt-4">
          <PainelCampanhasShopee />
        </div>
      </details>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Cadastradas</h2>
        {listas.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma lista ainda"
            description="Cole o link curto da Oferta Shopee (ou da coleção da outra loja), escolha categoria, loja e destino."
          />
        ) : (
          <ListasOfertaTabela listas={listas} />
        )}
      </section>
    </div>
  );
}
