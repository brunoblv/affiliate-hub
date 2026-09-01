"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bath, BedDouble, Flower2, Search, Shirt, Sofa, Star, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckboxLote, useSelecaoEmLote } from "@/components/admin/selecao-em-lote";
import {
  buscarOfertasPorComodoAction,
  importarOfertasShopeeEmLoteAction,
  type BuscaPorComodoState,
  type OfertaShopeeCurada,
} from "@/app/admin/(dashboard)/produtos/actions";
import { COMODOS_CASA, type ComodoId } from "@/lib/shopee/catalogo-comodos";
import { cn } from "@/lib/utils";

const ICONE_COMODO: Record<ComodoId, typeof BedDouble> = {
  quarto: BedDouble,
  sala: Sofa,
  cozinha: UtensilsCrossed,
  jardim: Flower2,
  banheiro: Bath,
  lavanderia: Shirt,
};

const LIMITE_IMPORT = 20;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function chaveOferta(oferta: Pick<OfertaShopeeCurada, "shopId" | "itemId">) {
  return `${oferta.shopId}_${oferta.itemId}`;
}

export function PainelBuscaShopee() {
  const router = useRouter();
  const [state, formAction, buscando] = useActionState<BuscaPorComodoState, FormData>(buscarOfertasPorComodoAction, {
    status: "idle",
  });
  const [comodos, setComodos] = useState<Set<string>>(() => new Set());
  const [tipos, setTipos] = useState<Set<string>>(() => new Set());
  const [importadosAgora, setImportadosAgora] = useState<Set<string>>(() => new Set());
  const [importando, startImportar] = useTransition();

  const ofertas = state.ofertas ?? [];

  useEffect(() => {
    setImportadosAgora(new Set());
  }, [state.ofertas]);

  const itensVisiveis = useMemo(
    () => COMODOS_CASA.filter((comodo) => comodos.has(comodo.id)).flatMap((comodo) => comodo.itens),
    [comodos],
  );

  const ofertasComFlag = useMemo(
    () =>
      ofertas.map((oferta) => ({
        ...oferta,
        jaImportado: oferta.jaImportado || importadosAgora.has(chaveOferta(oferta)),
      })),
    [ofertas, importadosAgora],
  );

  const idsSelecionaveis = ofertasComFlag.filter((o) => !o.jaImportado).map(chaveOferta);
  const selecao = useSelecaoEmLote(idsSelecionaveis);

  function toggleComodo(id: ComodoId) {
    const comodo = COMODOS_CASA.find((c) => c.id === id);
    if (!comodo) return;
    const ligando = !comodos.has(id);
    setComodos((atual) => {
      const proximo = new Set(atual);
      if (ligando) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
    setTipos((atual) => {
      const proximo = new Set(atual);
      for (const item of comodo.itens) {
        if (ligando) proximo.add(item.id);
        else proximo.delete(item.id);
      }
      return proximo;
    });
  }

  function toggleTipo(id: string) {
    setTipos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleOferta(id: string) {
    if (!selecao.selecionados.has(id) && selecao.quantidade >= LIMITE_IMPORT) {
      toast.error(`Selecione no máximo ${LIMITE_IMPORT} ofertas por vez.`);
      return;
    }
    selecao.toggle(id);
  }

  function importarSelecionados() {
    const escolhidas = ofertasComFlag
      .filter((o) => !o.jaImportado && selecao.selecionados.has(chaveOferta(o)))
      .slice(0, LIMITE_IMPORT);
    if (escolhidas.length === 0) return;

    startImportar(async () => {
      const toastId = toast.loading(
        escolhidas.length === 1 ? "Salvando oferta..." : `Salvando ${escolhidas.length} ofertas...`,
      );
      try {
        const resultado = await importarOfertasShopeeEmLoteAction({ ofertas: escolhidas });
        if (!resultado.ok) {
          toast.error(resultado.message, { id: toastId });
          return;
        }
        const partes: string[] = [];
        if (resultado.importados > 0) {
          partes.push(
            resultado.importados === 1 ? "1 produto salvo" : `${resultado.importados} produtos salvos`,
          );
        }
        if (resultado.jaExistiam > 0) partes.push(`${resultado.jaExistiam} já estavam no catálogo`);
        if (resultado.semLink > 0) partes.push(`${resultado.semLink} sem link de afiliado`);
        if (resultado.erros > 0) partes.push(`${resultado.erros} com erro`);

        if (resultado.importados > 0) {
          toast.success(partes.join(" · "), { id: toastId });
        } else {
          toast.warning(partes.join(" · ") || "Nada foi importado.", { id: toastId });
        }

        setImportadosAgora((atual) => {
          const proximo = new Set(atual);
          for (const oferta of escolhidas) proximo.add(chaveOferta(oferta));
          return proximo;
        });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Falha ao importar as ofertas.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Cômodo</legend>
          <div className="flex flex-wrap gap-2">
            {COMODOS_CASA.map((comodo) => {
              const Icone = ICONE_COMODO[comodo.id];
              const ativo = comodos.has(comodo.id);
              return (
                <button
                  key={comodo.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => toggleComodo(comodo.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  <Icone className="size-4" />
                  {comodo.label}
                </button>
              );
            })}
          </div>
          {[...comodos].map((id) => (
            <input key={id} type="hidden" name="comodos" value={id} />
          ))}
        </fieldset>

        {itensVisiveis.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo de item</legend>
            <div className="flex flex-wrap gap-2">
              {itensVisiveis.map((item) => {
                const ativo = tipos.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => toggleTipo(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      ativo
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {[...tipos].map((id) => (
              <input key={id} type="hidden" name="tipos" value={id} />
            ))}
          </fieldset>
        )}

        <div className="flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keywordExtra">Palavra-chave extra (opcional)</Label>
            <Input id="keywordExtra" name="keywordExtra" placeholder="ex.: organizador acrílico" />
          </div>
          <Button type="submit" disabled={buscando}>
            <Search />
            {buscando ? "Buscando..." : "Buscar ofertas"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O algoritmo ignora o que não está em promoção ou com preço bom, e o que foge do tema casa.
        </p>
      </form>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      {state.status === "success" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {state.message}
              {state.descartadas ? ` · ${state.descartadas} descartados` : ""}
            </p>
            {idsSelecionaveis.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <CheckboxLote
                  checked={selecao.todosSelecionados}
                  indeterminate={selecao.algunsSelecionados}
                  onChange={selecao.toggleTodos}
                  aria-label="Selecionar todas as ofertas"
                />
                Selecionar todas
              </label>
            )}
          </div>

          {ofertasComFlag.length === 0 ? null : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ofertasComFlag.map((oferta) => {
                const id = chaveOferta(oferta);
                const marcada = selecao.selecionados.has(id);
                return (
                  <article
                    key={id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-xl border bg-card",
                      marcada && "border-primary ring-2 ring-primary/20",
                      oferta.jaImportado && "opacity-60",
                    )}
                  >
                    <div className="relative aspect-square bg-muted">
                      {oferta.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={oferta.imagemUrl} alt={oferta.nome} className="size-full object-contain p-2" />
                      ) : (
                        <span className="flex size-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                          sem imagem
                        </span>
                      )}
                      <div className="absolute left-2 top-2">
                        {oferta.jaImportado ? (
                          <Badge variant="secondary">Já no catálogo</Badge>
                        ) : (
                          <Badge variant={oferta.motivo === "promocao" ? "default" : "outline"}>
                            {oferta.motivo === "promocao"
                              ? `${oferta.descontoPct}% off`
                              : "Bom preço"}
                          </Badge>
                        )}
                      </div>
                      {!oferta.jaImportado && (
                        <div className="absolute right-2 top-2 rounded-md bg-background/90 p-1">
                          <CheckboxLote
                            checked={marcada}
                            onChange={() => toggleOferta(id)}
                            aria-label={`Selecionar ${oferta.nome}`}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <h3 className="line-clamp-2 text-sm font-medium leading-snug">{oferta.nome}</h3>
                      <p className="text-xs text-muted-foreground">
                        {oferta.comodoLabel} · {oferta.tipoItemLabel}
                      </p>
                      <div className="mt-auto flex flex-wrap items-baseline gap-2">
                        {oferta.precoOriginal && oferta.precoOriginal > oferta.precoAtual && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(oferta.precoOriginal)}
                          </span>
                        )}
                        <span className="font-semibold">{formatCurrency(oferta.precoAtual)}</span>
                        {oferta.avaliacaoMedia != null && oferta.avaliacaoMedia > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="size-3 fill-current" />
                            {oferta.avaliacaoMedia.toFixed(1)}
                          </span>
                        )}
                      </div>
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
            {selecao.quantidade} {selecao.quantidade === 1 ? "oferta selecionada" : "ofertas selecionadas"}
          </p>
          <Button type="button" disabled={importando} onClick={importarSelecionados}>
            {importando ? "Salvando..." : "Salvar selecionados"}
          </Button>
        </div>
      )}
    </div>
  );
}
