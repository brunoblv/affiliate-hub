import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { dangerButton, EmptyRow, Field, inputClass, PageHeader, Panel, primaryButton } from "@/components/admin-ui";
import { BlogNav } from "@/components/blog-admin/blog-nav";
import { prisma } from "@/lib/db";
import { addJourneyNote, deleteJourneyNote } from "@/lib/blog/actions";
import { CATEGORIES } from "@/lib/blog/categories";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Jornada · Admin", robots: { index: false, follow: false } };

const date = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/**
 * Registros livres da jornada pessoal: viram contexto real para a IA nos artigos de
 * "jornada", em vez de detalhes inventados.
 */
export default async function JourneyPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const blogs = await prisma.blog.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, categories: true } });
  const blogId = asText((await searchParams).blog) || blogs[0]?.id || "";
  const blog = blogs.find((item) => item.id === blogId);
  const journeyCategories = (blog?.categories ?? []).filter((category) => CATEGORIES[category].usesJourneyNotes);
  const notes = blog ? await prisma.journeyNote.findMany({ where: { blogId: blog.id }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <AdminShell active="Blogs">
      <PageHeader title="Jornada" subtitle="Fatos reais da sua história. A IA usa esses registros nos artigos de jornada e não inventa o resto." />
      <BlogNav current="/admin/blog/jornada" />

      {blogs.length > 1 ? (
        <form method="get" className="mb-5 flex gap-2">
          <select name="blog" defaultValue={blogId} aria-label="Blog" className="h-[36px] rounded-lg border border-line bg-surface px-2.5 text-xs font-medium">
            {blogs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button type="submit" className="h-[36px] rounded-lg border border-line bg-surface px-3 text-xs font-semibold">
            Trocar
          </button>
        </form>
      ) : null}

      {blog ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Panel title="Novo registro">
            <form action={addJourneyNote} className="grid gap-4">
              <input type="hidden" name="blogId" value={blog.id} />
              <Field label="O que aconteceu (datas, valores, decisões, o que deu errado)">
                <textarea name="text" required rows={8} maxLength={5000} className={`${inputClass} h-auto py-2`} />
              </Field>
              {journeyCategories.length > 1 ? (
                <Field label="Linha editorial">
                  <select name="category" className={inputClass}>
                    <option value="">Todas as de jornada</option>
                    {journeyCategories.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORIES[category].label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <div>
                <button type="submit" className={primaryButton}>
                  Salvar registro
                </button>
              </div>
            </form>
          </Panel>
          <Panel title={`Registros do ${blog.name} (${notes.length})`}>
            {notes.length === 0 ? <EmptyRow>Nenhum registro ainda.</EmptyRow> : null}
            <ul className="flex flex-col gap-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border border-line p-3">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{note.text}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span>
                      {date(note.createdAt)}
                      {note.category ? ` · ${CATEGORIES[note.category].label}` : ""}
                    </span>
                    <form action={deleteJourneyNote}>
                      <input type="hidden" name="id" value={note.id} />
                      <button type="submit" className={dangerButton}>
                        Excluir
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : (
        <EmptyRow>Cadastre um blog primeiro.</EmptyRow>
      )}
    </AdminShell>
  );
}
