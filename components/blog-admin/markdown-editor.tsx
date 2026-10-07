"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { searchCatalogProducts, type EditorProduct } from "@/lib/blog/actions";
import { splitBlocks } from "@/lib/blog/body";

/**
 * Editor do corpo: markdown puro numa textarea, com atalhos e prévia. Shortcodes
 * ([produto:slug], [cta:url]) sempre entram como bloco próprio, separados por linha em
 * branco, que é o que o parser do blog exige.
 */

export async function uploadImage(file: File, alt = ""): Promise<{ id: string; url: string; alt: string | null }> {
  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt);
  const response = await fetch("/api/admin/media", { method: "POST", body: form });
  const json = (await response.json().catch(() => ({}))) as { id?: string; url?: string; alt?: string | null; error?: string };
  if (!response.ok || !json.url || !json.id) throw new Error(json.error ?? "Falha no upload da imagem.");
  return { id: json.id, url: json.url, alt: json.alt ?? null };
}

/** Insere um bloco no ponto do cursor, isolado por linhas em branco. */
function insertBlock(value: string, position: number, block: string): { value: string; cursor: number } {
  const before = value.slice(0, position);
  const after = value.slice(position);
  const lineStart = before.lastIndexOf("\n") + 1;
  // Cursor no meio de uma linha: o bloco vai depois dela, nunca a parte ao meio.
  const lineEnd = after.indexOf("\n");
  const splitAt = position === lineStart ? position : position + (lineEnd === -1 ? after.length : lineEnd);
  const head = value.slice(0, splitAt).replace(/\s+$/, "");
  const tail = value.slice(splitAt).replace(/^\s+/, "");
  const prefix = head ? `${head}\n\n` : "";
  const next = `${prefix}${block}\n\n${tail}`.replace(/\n{3,}$/, "\n");
  return { value: next, cursor: prefix.length + block.length + 2 };
}

/** Envolve a seleção (negrito, itálico) ou prefixa as linhas selecionadas (título, lista). */
function applyFormat(value: string, start: number, end: number, kind: "bold" | "italic" | "h2" | "h3" | "ul" | "ol" | "quote" | "link") {
  const selected = value.slice(start, end);
  if (kind === "bold" || kind === "italic" || kind === "link") {
    const text = selected || (kind === "link" ? "texto do link" : "texto");
    const wrapped = kind === "bold" ? `**${text}**` : kind === "italic" ? `_${text}_` : `[${text}](https://)`;
    return { value: value.slice(0, start) + wrapped + value.slice(end), start: start + wrapped.length, end: start + wrapped.length };
  }
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const prefixed = lines
    .map((line, index) => {
      const clean = line.replace(/^(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s+)/, "");
      if (kind === "h2") return `## ${clean}`;
      if (kind === "h3") return `### ${clean}`;
      if (kind === "ul") return `- ${clean}`;
      if (kind === "ol") return `${index + 1}. ${clean}`;
      return `> ${clean}`;
    })
    .join("\n");
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + prefixed.length };
}

function ToolButton({ label, title, onClick, active }: { label: ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-8 min-w-8 rounded-md px-2 text-[13px] font-semibold ${active ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-canvas hover:text-ink"}`}
    >
      {label}
    </button>
  );
}

function Preview({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-5 text-[15px] leading-relaxed">
      {splitBlocks(body).map((block, index) => {
        if (block.kind === "product") {
          return (
            <div key={index} className="rounded-lg border border-dashed border-brand bg-brand-soft px-4 py-3 text-[13px] text-brand-dark">
              Card do produto <strong>{block.slug}</strong> (foto, menor preço e botão de oferta)
            </div>
          );
        }
        if (block.kind === "cta") {
          return (
            <div key={index} className="flex justify-center">
              <span className="rounded-lg bg-ink px-5 py-2.5 text-[13px] font-semibold text-surface">{block.label}</span>
            </div>
          );
        }
        return (
          <div key={index} className="admin-markdown">
            <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{block.content}</Markdown>
          </div>
        );
      })}
    </div>
  );
}

function ProductPicker({ onPick, onClose }: { onPick: (product: EditorProduct) => void; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<EditorProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchCatalogProducts(term)
        .then((found) => !cancelled && setResults(found))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <div className="border-b border-line bg-canvas p-3">
      <div className="flex gap-2">
        <input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar produto no catálogo (nome ou slug)"
          aria-label="Buscar produto no catálogo"
          className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] outline-none focus:border-brand"
        />
        <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-[13px] font-semibold text-muted hover:text-ink">
          Fechar
        </button>
      </div>
      {loading ? <p className="mt-2 text-xs text-muted">Buscando…</p> : null}
      {results.length > 0 ? (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface">
          {results.map((product) => (
            <li key={product.slug} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-b-0">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt="" className="h-9 w-9 flex-none rounded object-contain" />
              ) : (
                <span className="photo-placeholder h-9 w-9 flex-none rounded" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{product.name}</span>
                <span className="block truncate text-[11px] text-muted">
                  {product.slug}
                  {product.published ? "" : " · rascunho (o card só aparece depois de publicado)"}
                </span>
              </span>
              <button type="button" onClick={() => onPick(product)} className="h-8 rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand hover:text-brand">
                Inserir
              </button>
            </li>
          ))}
        </ul>
      ) : term.trim().length >= 2 && !loading ? (
        <p className="mt-2 text-xs text-muted">Nenhum produto encontrado.</p>
      ) : null}
    </div>
  );
}

export function MarkdownEditor({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [panel, setPanel] = useState<"none" | "product" | "cta">("none");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const cursor = useRef(0);

  const remember = () => {
    if (area.current) cursor.current = area.current.selectionStart;
  };

  function place(next: { value: string; cursor: number }) {
    onChange(next.value);
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function format(kind: Parameters<typeof applyFormat>[3]) {
    const el = area.current;
    if (!el) return;
    const next = applyFormat(value, el.selectionStart, el.selectionEnd, kind);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  }

  async function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus({ tone: "good", text: "Enviando imagem…" });
    try {
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const media = await uploadImage(file, alt);
      place(insertBlock(value, cursor.current, `![${media.alt ?? alt}](${media.url})`));
      setStatus({ tone: "good", text: "Imagem inserida. Revise o texto alternativo entre colchetes." });
    } catch (error) {
      setStatus({ tone: "bad", text: error instanceof Error ? error.message : "Falha no upload." });
    }
  }

  function insertCta() {
    const url = ctaUrl.trim();
    if (!/^https:\/\/|^\/go\//.test(url)) {
      setStatus({ tone: "bad", text: "Use um link de afiliado https (meli.la, s.click.aliexpress.com, s.shopee.com.br) ou /go/código." });
      return;
    }
    const label = ctaLabel.trim().replace(/[\]|]/g, "");
    place(insertBlock(value, cursor.current, `[cta:${url}${label ? `|${label}` : ""}]`));
    setCtaUrl("");
    setCtaLabel("");
    setPanel("none");
    setStatus(null);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
        <ToolButton label="Escrever" title="Escrever" active={mode === "write"} onClick={() => setMode("write")} />
        <ToolButton label="Prévia" title="Prévia" active={mode === "preview"} onClick={() => setMode("preview")} />
        <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
        <ToolButton label="H2" title="Título de seção" onClick={() => format("h2")} />
        <ToolButton label="H3" title="Subtítulo" onClick={() => format("h3")} />
        <ToolButton label={<strong>B</strong>} title="Negrito" onClick={() => format("bold")} />
        <ToolButton label={<em>I</em>} title="Itálico" onClick={() => format("italic")} />
        <ToolButton label="• Lista" title="Lista" onClick={() => format("ul")} />
        <ToolButton label="1. Lista" title="Lista numerada" onClick={() => format("ol")} />
        <ToolButton label="❝" title="Citação" onClick={() => format("quote")} />
        <ToolButton label="Link" title="Link" onClick={() => format("link")} />
        <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
        <ToolButton label="Imagem" title="Enviar imagem" onClick={() => { remember(); fileInput.current?.click(); }} />
        <ToolButton label="Produto" title="Inserir card de produto" active={panel === "product"} onClick={() => { remember(); setPanel(panel === "product" ? "none" : "product"); }} />
        <ToolButton label="Botão" title="Inserir botão de afiliado" active={panel === "cta"} onClick={() => { remember(); setPanel(panel === "cta" ? "none" : "cta"); }} />
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={onImage} />
      </div>

      {panel === "product" ? (
        <ProductPicker
          onClose={() => setPanel("none")}
          onPick={(product) => {
            place(insertBlock(value, cursor.current, `[produto:${product.slug}]`));
            setPanel("none");
          }}
        />
      ) : null}
      {panel === "cta" ? (
        <div className="flex flex-wrap gap-2 border-b border-line bg-canvas p-3">
          <input value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://meli.la/abc123" aria-label="Link de afiliado" className="h-9 min-w-[240px] flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] outline-none focus:border-brand" />
          <input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Rótulo (opcional)" aria-label="Rótulo do botão" className="h-9 w-[200px] rounded-lg border border-line bg-surface px-3 text-[13px] outline-none focus:border-brand" />
          <button type="button" onClick={insertCta} className="h-9 rounded-lg bg-brand px-4 text-[13px] font-semibold text-surface hover:bg-brand-dark">
            Inserir botão
          </button>
        </div>
      ) : null}

      {status ? <p className={`border-b border-line px-3 py-2 text-xs ${status.tone === "bad" ? "text-bad" : "text-muted"}`}>{status.text}</p> : null}

      <textarea
        ref={area}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={remember}
        onBlur={remember}
        rows={28}
        spellCheck
        hidden={mode !== "write"}
        className="block w-full resize-y bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed outline-none"
        placeholder={"Escreva em markdown.\n\n## Título de seção\n\nParágrafo...\n\n[produto:slug-do-produto]"}
      />
      {mode === "preview" ? (
        <div className="min-h-[24rem] px-5 py-4">{value.trim() ? <Preview body={value} /> : <p className="text-[13px] text-muted">Nada para mostrar ainda.</p>}</div>
      ) : null}
    </div>
  );
}
