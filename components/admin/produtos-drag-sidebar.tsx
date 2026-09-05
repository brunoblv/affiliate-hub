"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { Input } from "@/components/ui/input";

export const TIPO_DRAG_PRODUTO = "application/x-produto-slug";

export interface ProdutoParaInserir {
  slug: string;
  nome: string;
  imagem: string | null;
}

/**
 * Lista lateral de produtos, cada um arrastável para o ponto do corpo onde
 * deve virar card ([produto:slug]). Clicar no card é o fallback sem drag
 * (acessibilidade/mobile): insere no fim do corpo.
 */
export function ProdutosDragSidebar({
  produtos,
  onInserirNoFim,
}: {
  produtos: ProdutoParaInserir[];
  onInserirNoFim: (slug: string) => void;
}) {
  const [filtro, setFiltro] = useState("");

  const filtrados = filtro.trim()
    ? produtos.filter((p) => p.nome.toLowerCase().includes(filtro.trim().toLowerCase()))
    : produtos;

  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-2">
      <Input
        placeholder="Buscar produto..."
        value={filtro}
        onChange={(event) => setFiltro(event.target.value)}
        className="h-8 text-xs"
      />
      <p className="px-0.5 text-[0.7rem] text-muted-foreground">Arraste um produto pro ponto do texto onde ele deve entrar.</p>
      <div className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto">
        {filtrados.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum produto encontrado.</p>}
        {filtrados.map((produto) => (
          <div
            key={produto.slug}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(TIPO_DRAG_PRODUTO, produto.slug);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onInserirNoFim(produto.slug)}
            title="Arraste até o texto, ou clique para inserir no fim"
            className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background p-1.5 text-left text-xs transition-colors hover:border-ring active:cursor-grabbing"
          >
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-10 shrink-0 rounded object-contain" />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                <Package className="size-4" />
              </div>
            )}
            <span className="line-clamp-2 leading-snug">{produto.nome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
