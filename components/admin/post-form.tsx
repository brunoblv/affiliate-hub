"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Post } from "@/lib/database";
import type { PostFormState } from "@/app/admin/(dashboard)/posts/actions";

const TIPOS = [
  { value: "JORNADA", label: "Jornada (editorial)" },
  { value: "PRODUTO", label: "Produto (página de um produto só)" },
  { value: "LISTA", label: "Lista (roundup com vários produtos)" },
];

export function PostForm({
  post,
  produtos,
  action,
}: {
  post?: Post;
  produtos: Array<{ slug: string; nome: string }>;
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
}) {
  const [state, formAction, isPending] = useActionState<PostFormState, FormData>(action, { status: "idle" });
  const [corpo, setCorpo] = useState(post?.corpo ?? "");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const corpoRef = useRef<HTMLTextAreaElement>(null);
  const produtoSelectRef = useRef<HTMLSelectElement>(null);

  function inserirNoCorpo(texto: string) {
    const textarea = corpoRef.current;
    if (!textarea) {
      setCorpo((atual) => `${atual}\n\n${texto}\n`);
      return;
    }
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const novo = `${corpo.slice(0, inicio)}\n${texto}\n${corpo.slice(fim)}`;
    setCorpo(novo);
    requestAnimationFrame(() => textarea.focus());
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setEnviandoImagem(true);
    try {
      const formData = new FormData();
      formData.set("arquivo", arquivo);
      const resposta = await fetch("/api/admin/midia", { method: "POST", body: formData });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.erro ?? "Falha no upload");
      inserirNoCorpo(json.markdown as string);
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Falha no upload da imagem.");
    } finally {
      setEnviandoImagem(false);
      event.target.value = "";
    }
  }

  function handleInserirProduto() {
    const slug = produtoSelectRef.current?.value;
    if (slug) inserirNoCorpo(`[produto:${slug}]`);
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={post?.tipo ?? "JORNADA"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="publicar"
            name="publicar"
            type="checkbox"
            defaultChecked={post?.status === "PUBLICADO"}
            className="size-4 rounded border-input"
          />
          <Label htmlFor="publicar" className="font-normal">
            Publicado (aparece no blog)
          </Label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" defaultValue={post?.titulo} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resumo">Resumo (opcional — gerado automaticamente se vazio)</Label>
        <Textarea id="resumo" name="resumo" defaultValue={post?.resumo ?? ""} rows={2} />
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="corpo">Corpo (markdown)</Label>
          <div className="flex items-center gap-2">
            {produtos.length > 0 && (
              <>
                <select
                  ref={produtoSelectRef}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none"
                >
                  {produtos.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="outline" onClick={handleInserirProduto}>
                  Inserir produto
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="outline" disabled={enviandoImagem} render={<label />}>
              {enviandoImagem ? "Enviando..." : "Inserir imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </Button>
          </div>
        </div>
        <Textarea
          id="corpo"
          name="corpo"
          ref={corpoRef}
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={16}
          required
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use <code>![alt](url)</code> para imagens e <code>[produto:slug-do-produto]</code>, sozinho na linha, para
          mostrar um card de produto.
        </p>
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">SEO (opcional)</summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitulo">Título SEO</Label>
            <Input id="seoTitulo" name="seoTitulo" defaultValue={post?.seoTitulo ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaDescricao">Meta description</Label>
            <Textarea id="metaDescricao" name="metaDescricao" defaultValue={post?.metaDescricao ?? ""} rows={2} />
          </div>
        </div>
      </details>

      {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : post ? "Salvar alterações" : "Criar post"}
      </Button>
    </form>
  );
}
