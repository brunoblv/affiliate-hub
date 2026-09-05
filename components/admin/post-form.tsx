"use client";

import { useActionState, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditorDoCorpo } from "@/components/admin/editor-do-corpo-dinamico";
import { ProdutosDragSidebar, TIPO_DRAG_PRODUTO, type ProdutoParaInserir } from "@/components/admin/produtos-drag-sidebar";
import { useFeedbackFormulario } from "@/components/admin/use-feedback-formulario";
import type { Post } from "@/lib/database";
import { enviarArquivoDeMidia } from "@/lib/midia/enviar-cliente";
import type { PostFormState } from "@/app/admin/(dashboard)/posts/actions";
import { gerarCapaComFundoAction } from "@/app/admin/(dashboard)/posts/actions";

const TIPOS = [
  { value: "JORNADA", label: "Jornada (editorial)" },
  { value: "PRODUTO", label: "Produto (página de um produto só)" },
  { value: "LISTA", label: "Lista (roundup com vários produtos)" },
];

const CATEGORIAS_EDITORIAIS = [
  { value: "", label: "Nenhuma" },
  { value: "DICAS_CASA", label: "Dicas de casa" },
  { value: "JORNADA_APARTAMENTO", label: "Jornada de compra de apartamento" },
];

const DESTINOS = [
  { value: "MEU_NOVO_LAR", label: "Meu Novo Lar" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "UMBANDA", label: "Umbanda" },
];

type CapaPreview = { id: string; url: string; alt: string | null };

export interface PostFormDefaults {
  titulo: string;
  resumo?: string;
  corpo: string;
  seoTitulo?: string;
  metaDescricao?: string;
  categoriaEditorial?: "DICAS_CASA" | "JORNADA_APARTAMENTO";
  tipo?: "JORNADA" | "PRODUTO" | "LISTA";
  avisoSeguranca?: boolean;
}

export function PostForm({
  post,
  produtos,
  action,
  defaults,
}: {
  post?: Post & { capa?: CapaPreview | null };
  produtos: ProdutoParaInserir[];
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  /** Preenche o formulário de post novo com conteúdo pré-gerado (ver /admin/posts/gerar). Ignorado em modo edição. */
  defaults?: PostFormDefaults;
}) {
  const [state, formAction, isPending] = useActionState<PostFormState, FormData>(action, { status: "idle" });
  useFeedbackFormulario(state);
  const [corpo, setCorpo] = useState(post?.corpo ?? defaults?.corpo ?? "");
  const [capa, setCapa] = useState<CapaPreview | null>(post?.capa ?? null);
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [gerandoCapa, setGerandoCapa] = useState(false);
  const [tipo, setTipo] = useState(post?.tipo ?? defaults?.tipo ?? "JORNADA");
  const editorRef = useRef<MDXEditorMethods>(null);
  const corpoWrapperRef = useRef<HTMLDivElement>(null);
  const [linhaDeInsercao, setLinhaDeInsercao] = useState<number | null>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const resumoRef = useRef<HTMLTextAreaElement>(null);

  async function handleUploadCapa(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setEnviandoCapa(true);
    try {
      const midia = await enviarArquivoDeMidia(arquivo);
      setCapa({ id: midia.id, url: midia.url, alt: midia.alt });
      toast.success("Capa enviada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha no upload da capa.");
    } finally {
      setEnviandoCapa(false);
      event.target.value = "";
    }
  }

  async function handleGerarCapa() {
    const titulo = tituloRef.current?.value.trim();
    if (!titulo) {
      toast.error("Preencha o título antes de gerar a capa.");
      return;
    }

    setGerandoCapa(true);
    try {
      const corpoAtual = editorRef.current?.getMarkdown() ?? corpo;
      const resultado = await gerarCapaComFundoAction({
        tipo,
        titulo,
        resumo: resumoRef.current?.value ?? "",
        corpo: corpoAtual,
        capaAnteriorId: capa?.id ?? null,
      });
      if (!resultado.ok) {
        toast.error(resultado.message, { duration: 8000 });
        return;
      }
      setCapa(resultado.midia);
      toast.success("Capa gerada com o tema do post.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao gerar a capa.");
    } finally {
      setGerandoCapa(false);
    }
  }

  // insertMarkdown insere no ponto do cursor, mas mescla o texto importado
  // dentro do parágrafo atual em vez de criar um parágrafo novo (e ainda
  // escapa o "[" já que sem quebra de linha ele parece início de link) — o
  // shortcode acaba grudado no texto anterior e o [produto:slug] deixa de
  // ficar sozinho na linha, quebrando a detecção em separarBlocos. Por isso
  // toda inserção passa por aqui: reparte o markdown em blocos de topo
  // (separados por linha em branco, o mesmo critério de separarBlocos),
  // encaixa o shortcode como bloco próprio no índice desejado e reaplica
  // tudo via setMarkdown (reparse completo) — o shortcode sempre nasce
  // isolado, não importa onde o produto foi solto.
  function inserirBlocoEmIndice(markdown: string, indice: number, blocoNovo: string): string {
    const blocos = markdown
      .trim()
      .split(/\n{2,}/)
      .filter((bloco) => bloco.trim().length > 0);
    const posicao = Math.max(0, Math.min(indice, blocos.length));
    blocos.splice(posicao, 0, blocoNovo);
    return `${blocos.join("\n\n")}\n`;
  }

  /** Elemento de bloco (parágrafo/lista/imagem/etc.) sob o cursor, 1 por bloco de topo do markdown. */
  function blocosDoEditor(): HTMLElement[] {
    const raiz = corpoWrapperRef.current?.querySelector('[contenteditable="true"]');
    return raiz ? (Array.from(raiz.children) as HTMLElement[]) : [];
  }

  /** Índice do bloco de topo antes do qual inserir, e a posição em px (relativa ao wrapper) da linha guia. */
  function calcularPontoDeInsercao(clientY: number): { indice: number; y: number } {
    const wrapper = corpoWrapperRef.current;
    const blocos = blocosDoEditor();
    if (!wrapper || blocos.length === 0) return { indice: 0, y: 0 };

    const wrapperTop = wrapper.getBoundingClientRect().top;
    for (let i = 0; i < blocos.length; i++) {
      const rect = blocos[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return { indice: i, y: rect.top - wrapperTop };
    }
    const ultimoRect = blocos.at(-1)!.getBoundingClientRect();
    return { indice: blocos.length, y: ultimoRect.bottom - wrapperTop };
  }

  function handleInserirProdutoNoFim(slug: string) {
    const atual = (editorRef.current?.getMarkdown() ?? corpo).trim();
    const novoCorpo = atual ? `${atual}\n\n[produto:${slug}]\n` : `[produto:${slug}]\n`;
    editorRef.current?.setMarkdown(novoCorpo);
    setCorpo(novoCorpo);
  }

  function handleDragOverCorpo(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(TIPO_DRAG_PRODUTO)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setLinhaDeInsercao(calcularPontoDeInsercao(event.clientY).y);
  }

  function handleDragLeaveCorpo(event: React.DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setLinhaDeInsercao(null);
  }

  function handleDropCorpo(event: React.DragEvent<HTMLDivElement>) {
    const slug = event.dataTransfer.getData(TIPO_DRAG_PRODUTO);
    setLinhaDeInsercao(null);
    if (!slug) return;
    event.preventDefault();

    const { indice } = calcularPontoDeInsercao(event.clientY);
    const atual = editorRef.current?.getMarkdown() ?? corpo;
    const novoCorpo = inserirBlocoEmIndice(atual, indice, `[produto:${slug}]`);
    editorRef.current?.setMarkdown(novoCorpo);
    setCorpo(novoCorpo);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const markdown = editorRef.current?.getMarkdown();
    if (markdown === undefined) return;
    const campo = event.currentTarget.elements.namedItem("corpo");
    if (campo instanceof HTMLInputElement) campo.value = markdown;
    setCorpo(markdown);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="max-w-5xl space-y-5">
      <input type="hidden" name="capaId" value={capa?.id ?? ""} />
      <input type="hidden" name="corpo" value={corpo} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value as typeof tipo)}
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
            defaultChecked={post?.status === "PUBLICADO" || (!post && defaults?.tipo === "LISTA")}
            className="size-4 rounded border-input"
          />
          <Label htmlFor="publicar" className="font-normal">
            Publicado (aparece no blog)
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="avisoSeguranca"
          name="avisoSeguranca"
          type="checkbox"
          defaultChecked={post?.avisoSeguranca ?? defaults?.avisoSeguranca ?? false}
          className="size-4 rounded border-input"
        />
        <Label htmlFor="avisoSeguranca" className="font-normal">
          Exibir aviso de segurança (posts sobre limpeza/produtos químicos)
        </Label>
      </div>

      {tipo === "JORNADA" && (
        <div className="space-y-1.5">
          <Label htmlFor="categoriaEditorial">Categoria editorial</Label>
          <select
            id="categoriaEditorial"
            name="categoriaEditorial"
            defaultValue={post?.categoriaEditorial ?? defaults?.categoriaEditorial ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CATEGORIAS_EDITORIAIS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="destino">Destino</Label>
        <select
          id="destino"
          name="destino"
          defaultValue={post?.destino ?? "MEU_NOVO_LAR"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DESTINOS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Só usado quando o tipo é Lista: define pra quais canais o botão &quot;Distribuir&quot; envia.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" ref={tituloRef} defaultValue={post?.titulo ?? defaults?.titulo ?? ""} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resumo">Resumo (opcional — gerado automaticamente se vazio)</Label>
        <Textarea id="resumo" name="resumo" ref={resumoRef} defaultValue={post?.resumo ?? defaults?.resumo ?? ""} rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label>Imagem de capa</Label>
        {capa ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capa.url} alt={capa.alt ?? ""} className="max-h-56 w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Nenhuma capa enviada
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={enviandoCapa} render={<label />}>
            {enviandoCapa ? "Enviando..." : capa ? "Trocar capa" : "Enviar capa"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleUploadCapa} />
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={gerandoCapa} onClick={handleGerarCapa}>
            {gerandoCapa ? "Gerando capa..." : "Gerar capa"}
          </Button>
          {capa && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setCapa(null)}>
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP ou AVIF, até 25 MB. Ideal: 1600×900 (16:9). O arquivo é salvo no servidor.
          &quot;Gerar capa&quot; pede uma cena do tema à API do ChatGPT e cola no fundo da identidade visual.
          Em post de lista, as fotos dos produtos entram numa montagem do cômodo.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Corpo</Label>
        <div className="flex items-start gap-3">
          <div
            ref={corpoWrapperRef}
            onDragOver={handleDragOverCorpo}
            onDragLeave={handleDragLeaveCorpo}
            onDrop={handleDropCorpo}
            className="relative min-w-0 flex-1"
          >
            <EditorDoCorpo ref={editorRef} markdown={post?.corpo ?? defaults?.corpo ?? ""} onChange={(markdown) => setCorpo(markdown)} />
            {linhaDeInsercao !== null && (
              <div
                className="pointer-events-none absolute inset-x-2 z-20 h-0.5 rounded bg-ring"
                style={{ top: linhaDeInsercao - 1 }}
              />
            )}
          </div>
          {produtos.length > 0 && (
            <div className="w-56 shrink-0">
              <ProdutosDragSidebar produtos={produtos} onInserirNoFim={handleInserirProdutoNoFim} />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Editor visual: títulos, listas, links e imagens (arraste ou use o ícone). O conteúdo continua sendo
          markdown. Arraste um produto da lista ao lado pro ponto do texto onde ele deve virar card. Lista de
          afiliado do Mercado Livre: <code className="text-[0.7rem]">[cta:https://meli.la/codigo]</code> em linha
          própria.
        </p>
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">SEO (opcional)</summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitulo">Título SEO</Label>
            <Input id="seoTitulo" name="seoTitulo" defaultValue={post?.seoTitulo ?? defaults?.seoTitulo ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaDescricao">Meta description</Label>
            <Textarea
              id="metaDescricao"
              name="metaDescricao"
              defaultValue={post?.metaDescricao ?? defaults?.metaDescricao ?? ""}
              rows={2}
            />
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
