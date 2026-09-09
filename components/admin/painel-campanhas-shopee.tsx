"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckboxLote, useSelecaoEmLote } from "@/components/admin/selecao-em-lote";
import {
  buscarCampanhasAction,
  importarCampanhasEmLoteAction,
  type BuscaCampanhasState,
} from "@/app/admin/(dashboard)/listas-oferta/campanhas-actions";
import { HOME_CATEGORIAS, LABEL_CATEGORIA } from "@/lib/produtos";
import { LABEL_DESTINO } from "@/lib/vitrine/destinos";
import { DESTINOS_LISTA_OFERTA, type DestinoListaOfertaId } from "@/lib/listas-oferta/destinos";
import { Destino, Categoria } from "@/lib/database/enums";
import { cn } from "@/lib/utils";

const LIMITE_IMPORT = 20;

function chaveCampanha(campanha: { offerLink: string }) {
  return campanha.offerLink;
}

export function PainelCampanhasShopee() {
  const router = useRouter();
  const [state, formAction, buscando] = useActionState<BuscaCampanhasState, FormData>(buscarCampanhasAction, {
    status: "idle",
  });
  const [destino, setDestino] = useState<Destino>(Destino.TIKTOK_SHOP);
  const [categoria, setCategoria] = useState<Categoria>(Categoria.CASA);
  const [redes, setRedes] = useState<Set<DestinoListaOfertaId>>(() => new Set(["WHATSAPP", "TELEGRAM"]));
  const [divulgarDiario, setDivulgarDiario] = useState(true);
  const [importadasAgora, setImportadasAgora] = useState<Set<string>>(() => new Set());
  const [campanhasAnteriores, setCampanhasAnteriores] = useState(state.campanhas);
  const [importando, startImportar] = useTransition();

  const campanhas = state.campanhas ?? [];

  // Zera a seleção quando uma nova busca troca a lista — ajuste de estado
  // durante a renderização, não em efeito (mesmo padrão de painel-mais-vendidos.tsx).
  if (state.campanhas !== campanhasAnteriores) {
    setCampanhasAnteriores(state.campanhas);
    setImportadasAgora(new Set());
  }

  const campanhasComFlag = useMemo(
    () =>
      campanhas.map((campanha) => ({
        ...campanha,
        jaImportada: campanha.jaImportada || importadasAgora.has(chaveCampanha(campanha)),
      })),
    [campanhas, importadasAgora],
  );

  const idsSelecionaveis = campanhasComFlag.filter((c) => !c.jaImportada).map(chaveCampanha);
  const selecao = useSelecaoEmLote(idsSelecionaveis);

  function toggleRede(id: DestinoListaOfertaId) {
    setRedes((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleCampanha(id: string) {
    if (!selecao.selecionados.has(id) && selecao.quantidade >= LIMITE_IMPORT) {
      toast.error(`Selecione no máximo ${LIMITE_IMPORT} campanhas por vez.`);
      return;
    }
    selecao.toggle(id);
  }

  function importarSelecionadas() {
    const escolhidas = campanhasComFlag
      .filter((c) => !c.jaImportada && selecao.selecionados.has(chaveCampanha(c)))
      .slice(0, LIMITE_IMPORT);
    if (escolhidas.length === 0) return;
    if (redes.size === 0) {
      toast.error("Marque pelo menos um destino de divulgação.");
      return;
    }

    startImportar(async () => {
      const toastId = toast.loading(
        escolhidas.length === 1 ? "Salvando campanha..." : `Salvando ${escolhidas.length} campanhas...`,
      );
      try {
        const resultado = await importarCampanhasEmLoteAction({
          campanhas: escolhidas,
          destino,
          categoria,
          redes: [...redes],
          divulgarDiario,
        });
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível importar.", { id: toastId });
          return;
        }
        const partes: string[] = [];
        if (resultado.importadas > 0) partes.push(`${resultado.importadas} lista(s) criada(s)`);
        if (resultado.jaExistiam > 0) partes.push(`${resultado.jaExistiam} já existiam`);
        if (resultado.erros > 0) partes.push(`${resultado.erros} com erro`);

        if (resultado.importadas > 0) {
          toast.success(partes.join(" · "), {
            id: toastId,
            action: { label: "Ver listas", onClick: () => router.push("/admin/listas-oferta") },
          });
        } else {
          toast.warning(partes.join(" · ") || "Nada foi importado.", { id: toastId });
        }

        setImportadasAgora((atual) => {
          const proximo = new Set(atual);
          for (const campanha of escolhidas) proximo.add(chaveCampanha(campanha));
          return proximo;
        });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao importar as campanhas.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="keyword-campanha">Palavra-chave (opcional)</Label>
          <Input id="keyword-campanha" name="keyword" placeholder="ex.: casa, cozinha, beleza..." />
        </div>
        <Button type="submit" disabled={buscando}>
          <Search />
          {buscando ? "Buscando..." : "Buscar campanhas"}
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="campanha-destino">Público (destino)</Label>
          <Select value={destino} onValueChange={(valor) => valor && setDestino(valor as Destino)}>
            <SelectTrigger id="campanha-destino" className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Destino).map((d) => (
                <SelectItem key={d} value={d}>
                  {LABEL_DESTINO[d] ?? d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campanha-categoria">Categoria</Label>
          <Select value={categoria} onValueChange={(valor) => valor && setCategoria(valor as Categoria)}>
            <SelectTrigger id="campanha-categoria" className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(destino === Destino.MEU_NOVO_LAR ? HOME_CATEGORIAS : Object.values(Categoria)).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {LABEL_CATEGORIA[cat] ?? cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {destino === Destino.MEU_NOVO_LAR && (
            <p className="text-xs text-muted-foreground">No Meu Novo Lar só entra categoria de casa/lar.</p>
          )}
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Divulgar em</legend>
          <div className="flex flex-wrap gap-2">
            {DESTINOS_LISTA_OFERTA.map((d) => {
              const ativo = redes.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => toggleRede(d.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    ativo
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <CheckboxLote checked={divulgarDiario} onChange={() => setDivulgarDiario((v) => !v)} aria-label="Divulgar diariamente" />
          Divulgar todo dia
        </label>
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      {state.status === "success" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">{state.message}</p>
            {idsSelecionaveis.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <CheckboxLote
                  checked={selecao.todosSelecionados}
                  indeterminate={selecao.algunsSelecionados}
                  onChange={selecao.toggleTodos}
                  aria-label="Selecionar todas as campanhas"
                />
                Selecionar todas
              </label>
            )}
          </div>

          {campanhasComFlag.length === 0 ? null : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {campanhasComFlag.map((campanha) => {
                const id = chaveCampanha(campanha);
                const marcada = selecao.selecionados.has(id);
                return (
                  <article
                    key={id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-xl border bg-card",
                      marcada && "border-primary ring-2 ring-primary/20",
                      campanha.jaImportada && "opacity-60",
                    )}
                  >
                    <div className="relative aspect-square bg-muted">
                      {campanha.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={campanha.imagemUrl} alt={campanha.offerName} className="size-full object-contain p-2" />
                      ) : (
                        <span className="flex size-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                          sem imagem
                        </span>
                      )}
                      <div className="absolute left-2 top-2">
                        {campanha.jaImportada ? (
                          <Badge variant="secondary">Já importada</Badge>
                        ) : (
                          campanha.comissaoPercentual != null && (
                            <Badge variant="default">
                              <Percent className="size-3" />
                              {campanha.comissaoPercentual.toFixed(0)}% comissão
                            </Badge>
                          )
                        )}
                      </div>
                      {!campanha.jaImportada && (
                        <div className="absolute right-2 top-2 rounded-md bg-background/90 p-1">
                          <CheckboxLote
                            checked={marcada}
                            onChange={() => toggleCampanha(id)}
                            aria-label={`Selecionar ${campanha.offerName}`}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <h3 className="line-clamp-2 text-sm font-medium leading-snug">{campanha.offerName}</h3>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selecao.quantidade > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm">
            {selecao.quantidade} {selecao.quantidade === 1 ? "campanha selecionada" : "campanhas selecionadas"}
          </p>
          <Button type="button" disabled={importando} onClick={importarSelecionadas}>
            {importando ? "Salvando..." : "Salvar selecionadas"}
          </Button>
        </div>
      )}
    </div>
  );
}
