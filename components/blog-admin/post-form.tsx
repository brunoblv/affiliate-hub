"use client";

import { useActionState, useState, useTransition } from "react";
import type { EditorialCategory, PostKind } from "@/lib/generated/prisma/enums";
import {
  addOpinionAction,
  generateCoverAction,
  inspectBodyProducts,
  productSheetAction,
  publishPostProducts,
  savePost,
  type EditorProduct,
  type PostFormState,
} from "@/lib/blog/actions";
import { CATEGORIES, KIND_LABELS } from "@/lib/blog/categories";
import { Field, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { MarkdownEditor, uploadImage } from "./markdown-editor";

export interface BlogOption {
  id: string;
  name: string;
  subdomain: string;
  authorName: string | null;
  categories: EditorialCategory[];
}

export interface PostFormValues {
  id?: string;
  blogId: string;
  kind: PostKind;
  category: EditorialCategory | null;
  title: string;
  slug?: string;
  summary: string;
  body: string;
  seoTitle: string;
  metaDescription: string;
  published: boolean;
  safetyNotice: boolean;
  authorName: string;
  cover: { id: string; url: string; alt: string | null } | null;
  coverText: string;
}

type Feedback = { tone: "good" | "bad"; text: string } | null;

const selectClass = `${inputClass} pr-2`;

export function PostForm({ blogs, initial }: { blogs: BlogOption[]; initial: PostFormValues }) {
  const action = savePost.bind(null, initial.id ?? null);
  const [state, formAction, saving] = useActionState<PostFormState, FormData>(action, { status: "idle" });

  const [blogId, setBlogId] = useState(initial.blogId || blogs[0]?.id || "");
  const [kind, setKind] = useState<PostKind>(initial.kind);
  const [category, setCategory] = useState<string>(initial.category ?? "");
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [cover, setCover] = useState(initial.cover);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [products, setProducts] = useState<EditorProduct[] | null>(null);
  const [, startTransition] = useTransition();

  const blog = blogs.find((item) => item.id === blogId);
  const categories = blog?.categories.length ? blog.categories : (Object.keys(CATEGORIES) as EditorialCategory[]);

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | null> {
    setBusy(label);
    setFeedback(null);
    try {
      return await task();
    } catch (error) {
      setFeedback({ tone: "bad", text: error instanceof Error ? error.message : "Falha inesperada." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onCoverFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const media = await run("cover-upload", () => uploadImage(file, title));
    if (media) {
      setCover(media);
      setFeedback({ tone: "good", text: "Capa enviada. Salve o post para gravar." });
    }
  }

  async function onGenerateCover() {
    const result = await run("cover-ai", () => generateCoverAction({ blogId, kind, title, summary, body, previousCoverId: cover && cover.id !== initial.cover?.id ? cover.id : null }));
    if (!result) return;
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setCover(result.media);
    setFeedback({ tone: "good", text: "Capa gerada. Salve o post para gravar." });
  }

  async function onOpinion() {
    const result = await run("opinion", () => addOpinionAction({ blogId, title, summary, body, category }));
    if (!result) return;
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setBody(result.body);
    setFeedback({ tone: "good", text: "Bloco de opinião acrescentado ao corpo. Revise e salve." });
  }

  async function onProductSheet() {
    const result = await run("sheet", () => productSheetAction({ blogId, body }));
    if (!result) return;
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setBody(result.body);
    if (!summary.trim()) setSummary(result.summary);
    if (!seoTitle.trim()) setSeoTitle(result.seoTitle);
    if (!metaDescription.trim()) setMetaDescription(result.metaDescription);
    setFeedback({ tone: "good", text: "Texto da ficha gerado. Revise e salve." });
  }

  function onInspect() {
    startTransition(async () => setProducts(await inspectBodyProducts(body)));
  }

  async function onPublishProducts() {
    if (!initial.id) return;
    const result = await run("publish-products", () => publishPostProducts(initial.id!));
    if (!result) return;
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setFeedback({ tone: "good", text: `${result.count} produto(s) publicado(s) no catálogo.` });
    setProducts(await inspectBodyProducts(body));
  }

  const drafts = products?.filter((item) => !item.published) ?? [];

  return (
    <form action={formAction} className="flex max-w-[1100px] flex-col gap-5">
      <input type="hidden" name="coverId" value={cover?.id ?? ""} />

      {state.status !== "idle" && state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} className={`rounded-[10px] px-4 py-3 text-[13px] font-medium ${state.status === "error" ? "bg-bad-bg text-bad-ink" : "bg-good-bg text-good"}`}>
          {state.message}
        </p>
      ) : null}
      {feedback ? (
        <p role={feedback.tone === "bad" ? "alert" : "status"} className={`rounded-[10px] px-4 py-3 text-[13px] font-medium ${feedback.tone === "bad" ? "bg-bad-bg text-bad-ink" : "bg-good-bg text-good"}`}>
          {feedback.text}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Blog">
          <select name="blogId" value={blogId} onChange={(event) => setBlogId(event.target.value)} className={selectClass} required>
            {blogs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as PostKind)} className={selectClass}>
            {(Object.keys(KIND_LABELS) as PostKind[]).map((value) => (
              <option key={value} value={value}>
                {KIND_LABELS[value]}
                {value === "EDITORIAL" ? " (listado e indexado)" : " (só pelo link, noindex)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Linha editorial">
          <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
            <option value="">Nenhuma</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {CATEGORIES[value].label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Título">
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} required maxLength={200} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Resumo (vazio = gerado do corpo)">
          <textarea name="summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} maxLength={400} className={`${inputClass} h-auto py-2`} />
        </Field>
        <div className="flex flex-col gap-4">
          <Field label={`Autor (vazio = ${blog?.authorName || "nome do blog"})`}>
            <input name="authorName" defaultValue={initial.authorName} className={inputClass} maxLength={80} />
          </Field>
          {initial.id ? (
            <Field label="Slug">
              <input name="slug" defaultValue={initial.slug} className={inputClass} maxLength={100} />
            </Field>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted">Capa (16:9, ideal 1600×900)</span>
        <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
          <div className="photo-placeholder flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg border border-line">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={cover.alt ?? ""} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted">Sem capa</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
              <label className={`${secondaryButton} inline-flex cursor-pointer items-center`}>
                {busy === "cover-upload" ? "Enviando…" : cover ? "Trocar capa" : "Enviar capa"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={onCoverFile} />
              </label>
              <button type="button" onClick={onGenerateCover} disabled={busy !== null} className={secondaryButton}>
                {busy === "cover-ai" ? "Gerando capa (até 1 min)…" : "Gerar capa com IA"}
              </button>
              {cover ? (
                <button type="button" onClick={() => setCover(null)} className={secondaryButton}>
                  Remover
                </button>
              ) : null}
            </div>
            <Field label="Frase da capa ilustrada (usada quando não há imagem; 2 a 4 palavras)" className="w-full max-w-sm">
              <input name="coverText" defaultValue={initial.coverText} maxLength={40} placeholder="Ex.: Adeus, mofo" className={inputClass} />
            </Field>
            <p className="text-xs text-muted">
              “Gerar capa” pede à OpenAI uma cena do tema (nas listas, com as fotos dos produtos) e cola na moldura da marca do blog.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">Corpo</span>
          <div className="flex flex-wrap gap-2">
            {kind === "EDITORIAL" ? (
              <button type="button" onClick={onOpinion} disabled={busy !== null || !body.trim()} className={secondaryButton}>
                {busy === "opinion" ? "Escrevendo…" : "Acrescentar opinião (IA)"}
              </button>
            ) : null}
            {kind === "PRODUCT" ? (
              <button type="button" onClick={onProductSheet} disabled={busy !== null} className={secondaryButton}>
                {busy === "sheet" ? "Escrevendo a ficha…" : "Gerar texto da ficha (IA)"}
              </button>
            ) : null}
            <button type="button" onClick={onInspect} className={secondaryButton}>
              Conferir produtos citados
            </button>
          </div>
        </div>
        <MarkdownEditor name="body" value={body} onChange={setBody} />
        <p className="text-xs text-muted">
          Shortcodes em linha própria: <code>[produto:slug]</code> vira o card com menor preço e botão de oferta; <code>[cta:https://meli.la/…|Rótulo]</code> vira botão.
        </p>
        {products ? (
          <div className="rounded-lg border border-line bg-canvas p-3 text-[13px]">
            {products.length === 0 ? (
              <p className="text-muted">Nenhum produto citado no corpo.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {products.map((item) => (
                  <li key={item.slug} className={item.published ? "text-good" : "text-bad-ink"}>
                    {item.published ? "✓" : "!"} {item.name} <span className="text-muted">({item.slug})</span>
                    {item.published ? "" : " — não aparece no post enquanto não estiver publicado no catálogo"}
                  </li>
                ))}
              </ul>
            )}
            {drafts.length > 0 && initial.id ? (
              <button type="button" onClick={onPublishProducts} disabled={busy !== null} className={`${secondaryButton} mt-2`}>
                Publicar os produtos em rascunho
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <details className="rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer text-[13px] font-semibold">SEO (opcional)</summary>
        <div className="mt-4 grid gap-4">
          <Field label="Título SEO (até ~60 caracteres)">
            <input name="seoTitle" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className={inputClass} maxLength={120} />
          </Field>
          <Field label="Meta description (até ~155 caracteres)">
            <textarea name="metaDescription" value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={2} maxLength={300} className={`${inputClass} h-auto py-2`} />
          </Field>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="publish" defaultChecked={initial.published} className="size-4" />
          Publicado
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="safetyNotice" defaultChecked={initial.safetyNotice} className="size-4" />
          Aviso de segurança (limpeza e produtos químicos)
        </label>
      </div>

      <div>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Salvando…" : initial.id ? "Salvar alterações" : "Criar post"}
        </button>
      </div>
    </form>
  );
}
