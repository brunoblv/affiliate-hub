"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckboxLote, useSelecaoEmLote } from "@/components/admin/selecao-em-lote";
import {
  buscarMaisVendidosPorCategoriaAction,
  importarOfertasShopeeEmLoteAction,
  type BuscaMaisVendidosState,
  type OfertaShopeeCurada,
} from "@/app/admin/(dashboard)/produtos/actions";
import { HOME_CATEGORIAS, LABEL_CATEGORIA } from "@/lib/produtos";
import { cn } from "@/lib/utils";

const LIMITE_IMPORT = 20;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function chaveOferta(oferta: Pick<OfertaShopeeCurada, "shopId" | "itemId">) {
  return `${oferta.shopId}_${oferta.itemId}`;
}

export function PainelMaisVendidos() {
  const router = useRouter();
  const [state, formAction, buscando] = useActionState<BuscaMaisVendidosState, FormData>(
    buscarMaisVendidosPorCategoriaAction,
    { status: "idle" },
  );
  const [categoria, setCategoria] = useState<string>(HOME_CATEGORIAS[0]!);
  const [importadosAgora, setImportadosAgora] = useState<Set<string>>(() => new Set());
  const [ofertasAnteriores, setOfertasAnteriores] = useState(state.ofertas);
  const [importando, startImportar] = useTransition();

  const ofertas = state.ofertas ?? [];

  // Zera a seleção quando uma nova busca troca a lista — ajuste de estado
  // durante a renderização (padrão recomendado do React), não em efeito.
  if (state.ofertas !== ofertasAnteriores) {
    setOfertasAnteriores(state.ofertas);
    setImportadosAgora(new Set());
  }

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
          partes.push(resultado.importados === 1 ? "1 produto salvo" : `${resultado.importados} produtos salvos`);
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
      <form action={formAction} className="space-y-4">
        <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="categoria-mais-vendidos">Categoria</Label>
            <Select value={categoria} onValueChange={(valor) => valor && setCategoria(valor)}>
              <SelectTrigger id="categoria-mais-vendidos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOME_CATEGORIAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {LABEL_CATEGORIA[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="categoria" value={categoria} />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keywordExtra">Palavra-chave extra (opcional)</Label>
            <Input id="keywordExtra" name="keywordExtra" placeholder="ex.: organizador acrílico" />
          </div>
          <Button type="submit" disabled={buscando}>
            <Search />
            {buscando ? "Buscando..." : "Buscar mais vendidos"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ordenado por vendas (sortType Most Sold da Shopee). Respeita o mínimo de vendas configurado em
          &quot;Configurações de importação e classificação&quot; acima.
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
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        {oferta.jaImportado ? (
                          <Badge variant="secondary">Já no catálogo</Badge>
                        ) : (
                          <Badge variant="default">
                            <TrendingUp className="size-3" />
                            {oferta.vendas != null ? `${oferta.vendas} vendidos` : "Mais vendido"}
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
                      <p className="text-xs text-muted-foreground">{oferta.tipoItemLabel}</p>
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
