"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";
import type {
  GerarTemaLarSmartResultado,
  GerarArtigoLarSmartResultado,
  GerarImagemLarSmartResultado,
  ProdutoLarSmartResumo,
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
    throw new Error(
      resposta.status === 504 || resposta.status === 502
        ? "Demorou demais pra responder. Tente de novo."
        : "Não foi possível ler a resposta do servidor.",
    );
  }
}

type EtapaStatus = "pendente" | "em-andamento" | "feito" | "erro";

function LinhaEtapa({ status, texto }: { status: EtapaStatus; texto: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {status === "feito" && <Check className="size-4 text-primary" />}
      {status === "em-andamento" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {status === "erro" && <X className="size-4 text-destructive" />}
      {status === "pendente" && <span className="size-4" />}
      <span className={status === "pendente" ? "text-muted-foreground" : ""}>{texto}</span>
    </li>
  );
}

export function LarSmartWizard() {
  const [topico, setTopico] = useState("");
  const [gerando, setGerando] = useState(false);
  const [etapas, setEtapas] = useState<{ texto: string; status: EtapaStatus }[]>([]);
  const [produtos, setProdutos] = useState<ProdutoLarSmartResumo[]>([]);
  const [postId, setPostId] = useState<string | null>(null);

  function atualizarEtapa(indice: number, status: EtapaStatus, texto?: string) {
    setEtapas((atual) => atual.map((etapa, i) => (i === indice ? { texto: texto ?? etapa.texto, status } : etapa)));
  }

  function adicionarEtapa(texto: string, status: EtapaStatus = "em-andamento"): number {
    let indice = -1;
    setEtapas((atual) => {
      indice = atual.length;
      return [...atual, { texto, status }];
    });
    return indice;
  }

  async function gerar() {
    if (!topico.trim()) {
      toast.error("Digite uma ideia de artigo.");
      return;
    }

    setGerando(true);
    setEtapas([]);
    setProdutos([]);
    setPostId(null);

    try {
      const iTema = adicionarEtapa("Analisando o tema...");
      const tema = await chamarApi<GerarTemaLarSmartResultado>("/api/admin/posts/larsmart/tema", { topico });
      if (!tema.ok) {
        atualizarEtapa(iTema, "erro", tema.erro);
        toast.error(tema.erro);
        return;
      }
      atualizarEtapa(
        iTema,
        "feito",
        `Tema analisado — ${tema.produtos.length} produto${tema.produtos.length === 1 ? "" : "s"} (${tema.doCatalogo} do catálogo, ${tema.doShopee} da Shopee)`,
      );
      setProdutos(tema.produtos);

      const iArtigo = adicionarEtapa("Escrevendo o artigo...");
      const artigo = await chamarApi<GerarArtigoLarSmartResultado>("/api/admin/posts/larsmart/artigo", {
        pauta: tema.pauta,
        slugs: tema.produtos.map((p) => p.slug),
      });
      if (!artigo.ok) {
        atualizarEtapa(iArtigo, "erro", artigo.erro);
        toast.error(artigo.erro);
        return;
      }
      atualizarEtapa(iArtigo, "feito", `Artigo gerado: "${artigo.titulo}"`);
      setPostId(artigo.postId);

      const iCapa = adicionarEtapa("Gerando imagem de capa...");
      const capa = await chamarApi<GerarImagemLarSmartResultado>("/api/admin/posts/larsmart/imagem", {
        postId: artigo.postId,
        alvo: { tipo: "CAPA" },
      });
      atualizarEtapa(iCapa, capa.ok ? "feito" : "erro", capa.ok ? "Capa gerada" : `Capa: ${capa.erro}`);

      for (let n = 0; n < artigo.produtos.length; n++) {
        const produto = artigo.produtos[n]!;
        const iImagem = adicionarEtapa(`Gerando imagem ${n + 1}/${artigo.produtos.length}...`);
        const resultado = await chamarApi<GerarImagemLarSmartResultado>("/api/admin/posts/larsmart/imagem", {
          postId: artigo.postId,
          alvo: { tipo: "PRODUTO", slug: produto.slug },
        });
        atualizarEtapa(
          iImagem,
          resultado.ok ? "feito" : "erro",
          resultado.ok ? `Imagem ${n + 1}/${artigo.produtos.length} gerada (${produto.nome})` : `Imagem de "${produto.nome}": ${resultado.erro}`,
        );
      }

      toast.success("Rascunho pronto pra revisão.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao gerar o artigo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <Textarea
          value={topico}
          onChange={(event) => setTopico(event.target.value)}
          placeholder='Ex.: "Espelhos na decoração: como escolher o modelo ideal para transformar seu ambiente"'
          disabled={gerando}
          rows={3}
        />
        <Button type="button" disabled={gerando} onClick={() => void gerar()}>
          <Sparkles />
          {gerando ? "Gerando..." : "Gerar artigo"}
        </Button>
      </div>

      {etapas.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-border p-4">
          {etapas.map((etapa, i) => (
            <LinhaEtapa key={i} status={etapa.status} texto={etapa.texto} />
          ))}
        </ul>
      )}

      {produtos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Produtos escolhidos</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {produtos.map((produto) => (
              <li key={produto.slug} className="rounded-lg border border-border px-3 py-2 text-sm">
                {produto.nome}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({produto.origem === "catalogo" ? "catálogo" : "Shopee"})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {postId && !gerando && (
        <Button render={<Link href={`/admin/posts/${postId}`} />}>Revisar rascunho</Button>
      )}
    </div>
  );
}
