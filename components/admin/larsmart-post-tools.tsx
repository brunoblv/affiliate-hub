"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, RefreshCw, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  GerarArtigoLarSmartResultado,
  GerarImagemLarSmartResultado,
  TrocarProdutoLarSmartResultado,
} from "@/app/admin/(dashboard)/posts/larsmart/tipos";

async function chamarApi<T>(url: string, body: unknown): Promise<T> {
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new Error("Não foi possível ler a resposta do servidor.");
  }
}

export function LarSmartPostTools({
  postId,
  produtos,
}: {
  postId: string;
  produtos: Array<{ slug: string; nome: string }>;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function regenerarArtigo() {
    setOcupado("artigo");
    try {
      const resultado = await chamarApi<GerarArtigoLarSmartResultado>("/api/admin/posts/larsmart/artigo", { postId });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success("Artigo regenerado.");
      router.refresh();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao regenerar o artigo.");
    } finally {
      setOcupado(null);
    }
  }

  async function regenerarImagem(alvo: { tipo: "CAPA" } | { tipo: "PRODUTO"; slug: string }) {
    const chave = alvo.tipo === "CAPA" ? "capa" : `imagem-${alvo.slug}`;
    setOcupado(chave);
    try {
      const resultado = await chamarApi<GerarImagemLarSmartResultado>("/api/admin/posts/larsmart/imagem", {
        postId,
        alvo,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(alvo.tipo === "CAPA" ? "Capa regenerada." : "Imagem regenerada.");
      router.refresh();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao regenerar a imagem.");
    } finally {
      setOcupado(null);
    }
  }

  async function trocarProduto(slug: string) {
    setOcupado(`trocar-${slug}`);
    try {
      const resultado = await chamarApi<TrocarProdutoLarSmartResultado>("/api/admin/posts/larsmart/trocar-produto", {
        postId,
        slugAntigo: slug,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(`Produto trocado por "${resultado.produtoNovo.nome}".`);
      router.refresh();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao trocar o produto.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4" />
          LarSmart
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={ocupado === "artigo"} onClick={() => void regenerarArtigo()}>
            <RefreshCw className={ocupado === "artigo" ? "animate-spin" : ""} />
            Regenerar artigo
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={ocupado === "capa"} onClick={() => void regenerarImagem({ tipo: "CAPA" })}>
            <RefreshCw className={ocupado === "capa" ? "animate-spin" : ""} />
            Regenerar capa
          </Button>
          <Button type="button" size="sm" variant="outline" render={<a href={`/api/admin/posts/larsmart/exportar/${postId}`} />}>
            <Download />
            Exportar para Pinterest
          </Button>
        </div>
      </div>

      {produtos.length > 0 && (
        <ul className="space-y-1.5">
          {produtos.map((produto) => (
            <li key={produto.slug} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{produto.nome}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={ocupado === `imagem-${produto.slug}`}
                  onClick={() => void regenerarImagem({ tipo: "PRODUTO", slug: produto.slug })}
                >
                  <RefreshCw className={ocupado === `imagem-${produto.slug}` ? "animate-spin" : ""} />
                  Regenerar imagem
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={ocupado === `trocar-${produto.slug}`}
                  onClick={() => void trocarProduto(produto.slug)}
                >
                  <Repeat className={ocupado === `trocar-${produto.slug}` ? "animate-spin" : ""} />
                  Trocar produto
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
