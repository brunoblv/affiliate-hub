"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LABEL_CATEGORIA, HOME_CATEGORIAS } from "@/lib/produtos";

const LABEL_SEGMENTO: Record<string, string> = {
  VENDE_BEM: "Vende bem",
  VENDE_BEM_DESCONTO: "Vende bem + desconto",
  POTENCIAL: "Potencial",
};

/** Filtros da curadoria do motor de produtos (Fase 1: Shopee) — /admin/produtos/shopee. */
export function ProdutosShopeeFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function atualizar(chave: string, valor: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    params.delete("page");
    router.push(`/admin/produtos/shopee?${params.toString()}`);
  }

  const temFiltro = ["segmento", "categoria", "descontoMin", "comissaoMin"].some((chave) => searchParams.get(chave));

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="filtro-segmento">Segmento</Label>
        <Select
          value={searchParams.get("segmento") ?? "todos"}
          onValueChange={(valor) => atualizar("segmento", valor === "todos" ? null : valor)}
        >
          <SelectTrigger id="filtro-segmento" className="min-w-56">
            <SelectValue placeholder="Todos os segmentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os segmentos (sem descartado)</SelectItem>
            {Object.entries(LABEL_SEGMENTO).map(([valor, rotulo]) => (
              <SelectItem key={valor} value={valor}>
                {rotulo}
              </SelectItem>
            ))}
            <SelectItem value="DESCARTADO">Descartado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filtro-categoria">Categoria</Label>
        <Select
          value={searchParams.get("categoria") ?? "todas"}
          onValueChange={(valor) => atualizar("categoria", valor === "todas" ? null : valor)}
        >
          <SelectTrigger id="filtro-categoria" className="min-w-56">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {HOME_CATEGORIAS.map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {LABEL_CATEGORIA[categoria] ?? categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filtro-desconto-min">Desconto mínimo (%)</Label>
        <Input
          id="filtro-desconto-min"
          type="number"
          min="0"
          max="100"
          className="w-32"
          defaultValue={searchParams.get("descontoMin") ?? ""}
          onBlur={(evento) => atualizar("descontoMin", evento.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filtro-comissao-min">Comissão mínima (%)</Label>
        <Input
          id="filtro-comissao-min"
          type="number"
          min="0"
          max="100"
          className="w-32"
          defaultValue={searchParams.get("comissaoMin") ?? ""}
          onBlur={(evento) => atualizar("comissaoMin", evento.target.value || null)}
        />
      </div>

      {temFiltro && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/admin/produtos/shopee")}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
