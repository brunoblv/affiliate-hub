"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EditorialCategory } from "@/lib/generated/prisma/enums";
import type { Theme } from "@/lib/blog/ai/editorial";
import type { ListBrief } from "@/lib/blog/lists";
import type { LarSmartProduct } from "@/lib/blog/larsmart";
import { CATEGORIES } from "@/lib/blog/categories";
import {
  generateListAction,
  larsmartDraftAction,
  larsmartImageAction,
  larsmartThemeAction,
  listBriefsAction,
  suggestThemeAction,
  writeArticleAction,
} from "@/lib/blog/ai-actions";
import { Field, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { PostForm, type BlogOption } from "./post-form";

type Feedback = { tone: "good" | "bad"; text: string } | null;

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p role={feedback.tone === "bad" ? "alert" : "status"} className={`rounded-[10px] px-4 py-3 text-[13px] font-medium ${feedback.tone === "bad" ? "bg-bad-bg text-bad-ink" : "bg-good-bg text-good"}`}>
      {feedback.text}
    </p>
  );
}

function BlogSelect({ blogs, value, onChange }: { blogs: BlogOption[]; value: string; onChange: (id: string) => void }) {
  if (blogs.length < 2) return null;
  return (
    <Field label="Blog">
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {blogs.map((blog) => (
          <option key={blog.id} value={blog.id}>
            {blog.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

const failure = (error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Falha inesperada." });

// ---------------------------------------------------------------------------
// Artigo editorial
// ---------------------------------------------------------------------------

export function ArticleWizard({ blogs }: { blogs: BlogOption[] }) {
  const [blogId, setBlogId] = useState(blogs[0]?.id ?? "");
  const blog = blogs.find((item) => item.id === blogId);
  const categories = blog?.categories.length ? blog.categories : (["HOME_TIPS"] as EditorialCategory[]);
  const [category, setCategory] = useState<EditorialCategory>(categories[0]!);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [busy, setBusy] = useState<"theme" | "article" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [draft, setDraft] = useState<{ title: string; summary: string; body: string; seoTitle: string; metaDescription: string } | null>(null);

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0]!);
  }, [categories, category]);

  async function suggest() {
    setBusy("theme");
    setFeedback(null);
    const result = await suggestThemeAction(blogId, category).catch(failure);
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setTheme(result.theme);
  }

  async function write() {
    if (!theme) return;
    setBusy("article");
    setFeedback(null);
    const result = await writeArticleAction(blogId, category, theme).catch(failure);
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    const { article } = result;
    setDraft({ title: article.titulo, summary: article.resumo, body: article.corpo, seoTitle: article.seoTitulo, metaDescription: article.metaDescricao });
  }

  if (draft) {
    return (
      <div className="flex flex-col gap-4">
        <Message feedback={{ tone: "good", text: "Artigo gerado. Revise, gere a capa e salve; nada foi gravado ainda." }} />
        <PostForm
          blogs={blogs}
          initial={{ blogId, kind: "EDITORIAL", category, ...draft, published: false, safetyNotice: false, authorName: "", cover: null, coverText: "" }}
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Message feedback={feedback} />
      <BlogSelect blogs={blogs} value={blogId} onChange={(id) => { setBlogId(id); setTheme(null); }} />
      <Field label="Linha editorial">
        <select value={category} onChange={(event) => { setCategory(event.target.value as EditorialCategory); setTheme(null); }} className={inputClass}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {CATEGORIES[value].label}
              {CATEGORIES[value].usesJourneyNotes ? " (usa as notas da Jornada)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <button type="button" onClick={suggest} disabled={busy !== null} className={secondaryButton}>
          {busy === "theme" ? "Pensando num tema…" : theme ? "Sugerir outro tema" : "Sugerir tema"}
        </button>
      </div>
      {theme ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div>
            <p className="text-[15px] font-semibold">{theme.titulo}</p>
            <p className="mt-1 text-[13px] text-muted">{theme.resumoPauta}</p>
            <p className="mt-1 text-xs text-muted">Palavra-chave: {theme.palavraChave}</p>
          </div>
          <div>
            <button type="button" onClick={write} disabled={busy !== null} className={primaryButton}>
              {busy === "article" ? "Escrevendo o artigo (até 2 min)…" : "Escrever artigo com esse tema"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista por pauta
// ---------------------------------------------------------------------------

export function ListWizard({ blogs }: { blogs: BlogOption[] }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState(blogs[0]?.id ?? "");
  const [briefs, setBriefs] = useState<ListBrief[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!blogId) return;
    listBriefsAction(blogId).then(setBriefs).catch(() => setBriefs([]));
  }, [blogId]);

  async function generate(briefId: string) {
    setBusy(briefId);
    setFeedback(null);
    const result = await generateListAction(blogId, briefId).catch(failure);
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    router.push(`/admin/blog/${result.postId}?aviso=${encodeURIComponent(result.warning ?? "Lista gerada como rascunho. Revise e publique.")}`);
  }

  const groups: { title: string; items: ListBrief[] }[] = [
    { title: "Por cômodo", items: briefs.filter((brief) => brief.grupo === "comodo") },
    { title: "Por tema", items: briefs.filter((brief) => brief.grupo !== "comodo") },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Message feedback={feedback} />
      <BlogSelect blogs={blogs} value={blogId} onChange={setBlogId} />
      {briefs.length === 0 ? <p className="text-[13px] text-muted">Este blog não tem pautas (content/blogs/&lt;subdomínio&gt;/listas.json).</p> : null}
      {groups.map((group) =>
        group.items.length ? (
          <section key={group.title} className="flex flex-col gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.05em] text-muted">{group.title}</h2>
            <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line bg-surface">
              {group.items.map((brief) => (
                <li key={brief.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{brief.titulo}</span>
                    <span className="block text-xs text-muted">{brief.angulo}</span>
                  </span>
                  <button type="button" onClick={() => generate(brief.id)} disabled={busy !== null} className={secondaryButton}>
                    {busy === brief.id ? "Gerando (até 2 min)…" : "Gerar lista"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      <p className="text-xs text-muted">
        Os produtos vêm do catálogo publicado (com oferta e link de afiliado ativos), escolhidos pelo nome. A lista nasce como rascunho, já com capa.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LarSmart
// ---------------------------------------------------------------------------

type ImageState = "pending" | "running" | "done" | "error";

export function LarSmartWizard({ blogs }: { blogs: BlogOption[] }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState(blogs[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [brief, setBrief] = useState<ListBrief | null>(null);
  const [products, setProducts] = useState<LarSmartProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [post, setPost] = useState<{ id: string; title: string; products: { slug: string; name: string }[] } | null>(null);
  const [images, setImages] = useState<Record<string, ImageState>>({});

  async function interpret() {
    setBusy("theme");
    setFeedback(null);
    const result = await larsmartThemeAction(blogId, topic).catch(failure);
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setBrief(result.brief);
    setProducts(result.products);
    setSelected(new Set(result.products.map((item) => item.slug)));
    if (result.fromShopee) {
      setFeedback({ tone: "good", text: `${result.fromCatalog} do catálogo e ${result.fromShopee} importado(s) da Shopee como rascunho (publique-os depois para o card aparecer).` });
    }
  }

  async function write() {
    if (!brief) return;
    setBusy("draft");
    setFeedback(null);
    const slugs = products.map((item) => item.slug).filter((slug) => selected.has(slug));
    const result = await larsmartDraftAction(blogId, brief, slugs).catch(failure);
    setBusy(null);
    if (!result.ok) return setFeedback({ tone: "bad", text: result.error });
    setPost({ id: result.postId, title: result.title, products: result.products });
    setImages(Object.fromEntries([["cover", "pending"], ...result.products.map((item) => [item.slug, "pending"])]));
  }

  async function generateImages() {
    if (!post) return;
    setBusy("images");
    const targets: { key: string; run: () => ReturnType<typeof larsmartImageAction> }[] = [
      { key: "cover", run: () => larsmartImageAction(post.id, { kind: "COVER" }) },
      ...post.products.map((item) => ({ key: item.slug, run: () => larsmartImageAction(post.id, { kind: "PRODUCT", slug: item.slug }) })),
    ];
    let failures = 0;
    // Uma por vez: cada imagem leva até ~1 min e a OpenAI limita requisições simultâneas.
    for (const target of targets) {
      if (images[target.key] === "done") continue;
      setImages((current) => ({ ...current, [target.key]: "running" }));
      const result = await target.run().catch(failure);
      if (!result.ok) failures++;
      setImages((current) => ({ ...current, [target.key]: result.ok ? "done" : "error" }));
    }
    setBusy(null);
    setFeedback(failures ? { tone: "bad", text: `${failures} imagem(ns) falharam. Tente de novo ou gere pelo editor do post.` } : { tone: "good", text: "Imagens prontas." });
  }

  const label: Record<ImageState, string> = { pending: "aguardando", running: "gerando…", done: "pronta", error: "falhou" };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Message feedback={feedback} />
      <BlogSelect blogs={blogs} value={blogId} onChange={setBlogId} />

      {!post ? (
        <>
          <Field label="Ideia do artigo (ex.: espelhos na decoração de apartamento pequeno)">
            <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={2} maxLength={300} className={`${inputClass} h-auto py-2`} />
          </Field>
          <div>
            <button type="button" onClick={interpret} disabled={busy !== null || !topic.trim()} className={secondaryButton}>
              {busy === "theme" ? "Interpretando e buscando produtos…" : brief ? "Interpretar de novo" : "1. Interpretar tema e escolher produtos"}
            </button>
          </div>
        </>
      ) : null}

      {brief && !post ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div>
            <p className="text-[15px] font-semibold">{brief.titulo}</p>
            <p className="mt-1 text-[13px] text-muted">{brief.angulo}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {products.map((item) => (
              <li key={item.slug}>
                <label className="flex items-center gap-3 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selected.has(item.slug)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) next.add(item.slug);
                      else next.delete(item.slug);
                      setSelected(next);
                    }}
                    className="size-4"
                  />
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <span className="photo-placeholder h-10 w-10 rounded" />
                  )}
                  <span className="min-w-0 flex-1">
                    {item.name}
                    {item.draft ? <span className="text-warn-ink"> · rascunho no catálogo</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" onClick={write} disabled={busy !== null || selected.size < 3} className={primaryButton}>
              {busy === "draft" ? "Escrevendo o artigo (até 2 min)…" : `2. Escrever artigo com ${selected.size} produtos`}
            </button>
          </div>
        </div>
      ) : null}

      {post ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-[15px] font-semibold">Rascunho criado: {post.title}</p>
          <ul className="flex flex-col gap-1 text-[13px]">
            <li>Capa: {label[images.cover ?? "pending"]}</li>
            {post.products.map((item) => (
              <li key={item.slug}>
                Imagem de {item.name}: {label[images[item.slug] ?? "pending"]}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={generateImages} disabled={busy !== null} className={primaryButton}>
              {busy === "images" ? "Gerando imagens…" : "3. Gerar capa e imagens (OpenAI)"}
            </button>
            <button type="button" onClick={() => router.push(`/admin/blog/${post.id}`)} disabled={busy !== null} className={secondaryButton}>
              Abrir no editor
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
