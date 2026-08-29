"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PostForm, type PostFormDefaults } from "@/components/admin/post-form";
import { sugerirTemaAction, gerarArtigoAction } from "@/app/admin/(dashboard)/posts/gerar/actions";
import { createPostAction } from "@/app/admin/(dashboard)/posts/actions";
import type { TemaEditorial } from "@/lib/conteudo/pauta-editorial";
import type { CategoriaEditorial } from "@/lib/database";

const CATEGORIAS = [
  { value: "DICAS_CASA" as const, label: "Dicas de casa" },
  { value: "JORNADA_APARTAMENTO" as const, label: "Jornada de compra de apartamento" },
];

export function GerarArtigoWizard({ produtos }: { produtos: Array<{ slug: string; nome: string }> }) {
  const [categoria, setCategoria] = useState<CategoriaEditorial>("DICAS_CASA");
  const [tema, setTema] = useState<TemaEditorial | null>(null);
  const [defaults, setDefaults] = useState<PostFormDefaults | null>(null);
  const [sugerindo, startSugerir] = useTransition();
  const [gerando, startGerar] = useTransition();

  function sugerirTema() {
    setTema(null);
    startSugerir(async () => {
      const resultado = await sugerirTemaAction(categoria);
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      setTema(resultado.tema);
    });
  }

  function gerarArtigo() {
    if (!tema) return;
    startGerar(async () => {
      const resultado = await gerarArtigoAction(categoria, tema);
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      setDefaults({ ...resultado.artigo, categoriaEditorial: categoria });
      toast.success("Artigo gerado — revise antes de salvar.");
    });
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

      <Button type="button" variant="outline" disabled={sugerindo} onClick={sugerirTema}>
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
          <Button type="button" disabled={gerando} onClick={gerarArtigo}>
            {gerando ? "Escrevendo o artigo..." : "Gerar artigo com esse tema"}
          </Button>
        </div>
      )}
    </div>
  );
}
