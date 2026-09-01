"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PostForm, type PostFormDefaults } from "@/components/admin/post-form";
import { createPostAction } from "@/app/admin/(dashboard)/posts/actions";
import type { GerarArtigoResultado, SugerirTemaResultado } from "@/app/admin/(dashboard)/posts/gerar/tipos";
import type { TemaEditorial } from "@/lib/conteudo/pauta-editorial";
import type { CategoriaEditorial } from "@/lib/database/enums";

const CATEGORIAS = [
  { value: "DICAS_CASA" as const, label: "Dicas de casa" },
  { value: "JORNADA_APARTAMENTO" as const, label: "Jornada de compra de apartamento" },
];

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
        ? "O servidor demorou demais pra responder. Tente de novo."
        : "Não foi possível ler a resposta do servidor. Tente de novo.",
    );
  }
}

export function GerarArtigoWizard({ produtos }: { produtos: Array<{ slug: string; nome: string }> }) {
  const [categoria, setCategoria] = useState<CategoriaEditorial>("DICAS_CASA");
  const [tema, setTema] = useState<TemaEditorial | null>(null);
  const [defaults, setDefaults] = useState<PostFormDefaults | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [gerando, setGerando] = useState(false);

  async function sugerirTema() {
    setTema(null);
    setSugerindo(true);
    try {
      const resultado = await chamarApi<SugerirTemaResultado>("/api/admin/posts/sugerir-tema", { categoria });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      setTema(resultado.tema);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao sugerir tema.");
    } finally {
      setSugerindo(false);
    }
  }

  async function gerarArtigo() {
    if (!tema) return;
    setGerando(true);
    try {
      const resultado = await chamarApi<GerarArtigoResultado>("/api/admin/posts/gerar-artigo", { categoria, tema });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      setDefaults({ ...resultado.artigo, categoriaEditorial: categoria });
      toast.success("Artigo gerado — revise antes de salvar.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao gerar o artigo.");
    } finally {
      setGerando(false);
    }
  }

  if (defaults) {
    return <PostForm produtos={produtos} action={createPostAction} defaults={defaults} />;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="categoria">Categoria</Label>
        <select
          id="categoria"
          value={categoria}
          onChange={(event) => {
            setCategoria(event.target.value as CategoriaEditorial);
            setTema(null);
          }}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="button" variant="outline" disabled={sugerindo} onClick={() => void sugerirTema()}>
        {tema ? <RefreshCw /> : <Sparkles />}
        {sugerindo ? "Pensando num tema..." : tema ? "Sugerir outro tema" : "Sugerir tema"}
      </Button>

      {tema && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">{tema.titulo}</p>
            <p className="text-sm text-muted-foreground">{tema.resumoPauta}</p>
            <p className="mt-1 text-xs text-muted-foreground">Palavra-chave: {tema.palavraChave}</p>
          </div>
          <Button type="button" disabled={gerando} onClick={() => void gerarArtigo()}>
            {gerando ? "Escrevendo o artigo..." : "Gerar artigo com esse tema"}
          </Button>
        </div>
      )}
    </div>
  );
}
