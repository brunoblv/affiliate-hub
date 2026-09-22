import { AutoRefresh } from "@/components/auto-refresh";
import { StatusPill } from "@/components/admin-shell";
import { Field, Panel, dangerButton, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import {
  markReviewed,
  publishContent,
  regenerateSection,
  saveContent,
  saveSource,
  startGeneration,
  unpublishContent,
} from "@/lib/admin/content-actions";
import { isGenerationStale } from "@/lib/content/generate";
import { specsFrom } from "@/lib/content/prompt";
import { SECTION_LABELS, type ContentIssue, type SectionKey } from "@/lib/content/types";
import { asSections } from "@/lib/content/validate";
import type { Prisma, ProductContent } from "@/lib/generated/prisma/client";

const STATUS = {
  PENDING: { label: "Sem texto", tone: "neutral" },
  GENERATING: { label: "Gerando", tone: "warn" },
  DRAFT: { label: "Rascunho", tone: "warn" },
  REVIEWED: { label: "Revisado", tone: "good" },
  PUBLISHED: { label: "Publicado", tone: "good" },
  FAILED: { label: "Falhou", tone: "bad" },
} as const;

const areaClass =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-brand";

export function ContentTab({
  productId,
  specs,
  content,
  geminiConfigured,
}: {
  productId: string;
  specs: Prisma.JsonValue | null;
  content: ProductContent | null;
  geminiConfigured: boolean;
}) {
  const now = new Date();
  const status = content?.status ?? "PENDING";
  const generating = status === "GENERATING" && !isGenerationStale(content?.generationStartedAt ?? null, now);
  const stuck = status === "GENERATING" && !generating;
  const sections = content?.sections ? asSections(content.sections) : null;
  const issues = ((content?.issues as ContentIssue[] | null) ?? []).filter(Boolean);
  const pendencies = (content?.pendencies as string[] | null) ?? [];
  const protectedKeys = content?.protectedKeys ?? [];
  const blocked = issues.some((issue) => issue.severity === "error");
  const specsText = specsFrom(specs)
    .map((spec) => `${spec.nome}: ${spec.valor}`)
    .join("\n");

  const issuesFor = (key: SectionKey) => issues.filter((issue) => issue.section === key);

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      {generating ? <AutoRefresh /> : null}

      <Panel
        title="Estado do texto"
        action={<StatusPill label={stuck ? "travado" : STATUS[status].label} tone={stuck ? "bad" : STATUS[status].tone} />}
      >
        <div className="flex flex-col gap-2 text-[13px] text-muted">
          {generating ? <p>Gerando o texto com o Gemini… a página atualiza sozinha.</p> : null}
          {stuck ? <p className="text-bad-ink">A geração ficou presa por mais de 5 minutos. Pode gerar de novo.</p> : null}
          {content?.error && status === "FAILED" ? <p className="text-bad-ink">{content.error}</p> : null}
          {content?.generatedAt ? (
            <p>
              Gerado em {content.generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · modelo {content.model} · prompt{" "}
              {content.promptVersion} · {content.inputTokens ?? "?"} tokens de entrada / {content.outputTokens ?? "?"} de saída
            </p>
          ) : null}
          {pendencies.map((pendency) => (
            <p key={pendency} className="text-warn-ink">
              Pendência: {pendency}
            </p>
          ))}
          <p>
            O preço nunca entra no texto: ele é sempre lido do banco na página. Editar ou regenerar tira o texto do ar até uma nova
            revisão.
          </p>
        </div>
      </Panel>

      <Panel title="Fontes do texto">
        <p className="mb-3 text-xs text-muted">
          O modelo só usa o que estiver aqui e nos dados do produto. Sem fonte ele não gera, para não inventar.
        </p>
        <form action={saveSource} className="flex flex-col gap-3.5">
          <input type="hidden" name="productId" value={productId} />
          <Field label="Material de referência (ficha do fabricante, descrição da loja, modo de uso)">
            <textarea name="sourceMaterial" rows={7} defaultValue={content?.sourceMaterial ?? ""} className={areaClass} />
          </Field>
          <Field label="Especificações (uma por linha, “nome: valor”)">
            <textarea name="specs" rows={5} defaultValue={specsText} placeholder={"Cor: branca\nMaterial: plástico ABS\nMedidas: 30 x 20 x 5 cm"} className={areaClass} />
          </Field>
          <div>
            <button type="submit" className={secondaryButton}>
              Salvar fontes
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Gerar com Gemini">
        {geminiConfigured ? null : (
          <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-ink">Gemini não configurado: defina GEMINI_API_KEY no .env.</p>
        )}
        <form action={startGeneration} className="flex items-center gap-3">
          <input type="hidden" name="productId" value={productId} />
          <button type="submit" disabled={generating || !geminiConfigured} className={`${primaryButton} disabled:opacity-50`}>
            {sections ? "Gerar de novo (texto todo)" : "Gerar texto"}
          </button>
          <span className="text-xs text-muted">Seções editadas à mão continuam protegidas.</span>
        </form>
      </Panel>

      {sections ? (
        <form action={saveContent} className="flex flex-col gap-5">
          <input type="hidden" name="productId" value={productId} />

          {issues.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-2 text-[15px] font-bold">Verificação do texto</h2>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {issues.map((issue, index) => (
                  <li key={index} className={issue.severity === "error" ? "text-bad-ink" : "text-warn-ink"}>
                    <strong>{issue.severity === "error" ? "Erro" : "Aviso"}</strong> ·{" "}
                    {issue.section === "geral" ? "Geral" : SECTION_LABELS[issue.section]}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Panel title="Texto">
            <div className="flex flex-col gap-5">
              <SectionField k="title" protectedKeys={protectedKeys} issues={issuesFor("title")}>
                <input name="title" defaultValue={sections.title} className={inputClass} />
              </SectionField>
              <SectionField k="summary" protectedKeys={protectedKeys} issues={issuesFor("summary")}>
                <textarea name="summary" rows={2} defaultValue={sections.summary} className={areaClass} />
              </SectionField>
              <SectionField k="description" protectedKeys={protectedKeys} issues={issuesFor("description")}>
                <textarea name="description" rows={9} defaultValue={sections.description} className={areaClass} />
              </SectionField>
              <SectionField k="benefits" protectedKeys={protectedKeys} issues={issuesFor("benefits")} hint="Um por linha.">
                <textarea name="benefits" rows={5} defaultValue={sections.benefits.join("\n")} className={areaClass} />
              </SectionField>
              <SectionField k="audience" protectedKeys={protectedKeys} issues={issuesFor("audience")}>
                <textarea name="audience" rows={2} defaultValue={sections.audience} className={areaClass} />
              </SectionField>
              <SectionField k="howToUse" protectedKeys={protectedKeys} issues={issuesFor("howToUse")} hint="Só com instruções do fabricante no material. Vazio = não exibe.">
                <textarea name="howToUse" rows={4} defaultValue={sections.howToUse ?? ""} className={areaClass} />
              </SectionField>
              <SectionField k="limitations" protectedKeys={protectedKeys} issues={issuesFor("limitations")} hint="Um por linha.">
                <textarea name="limitations" rows={4} defaultValue={sections.limitations.join("\n")} className={areaClass} />
              </SectionField>
              <SectionField k="faq" protectedKeys={protectedKeys} issues={issuesFor("faq")} hint="Blocos separados por linha em branco: a 1ª linha é a pergunta e o resto, a resposta.">
                <textarea
                  name="faq"
                  rows={9}
                  defaultValue={sections.faq.map((entry) => `${entry.question}\n${entry.answer}`).join("\n\n")}
                  className={areaClass}
                />
              </SectionField>
              <SectionField k="metaTitle" protectedKeys={protectedKeys} issues={issuesFor("metaTitle")}>
                <input name="metaTitle" defaultValue={sections.metaTitle} className={inputClass} />
              </SectionField>
              <SectionField k="metaDescription" protectedKeys={protectedKeys} issues={issuesFor("metaDescription")}>
                <textarea name="metaDescription" rows={2} defaultValue={sections.metaDescription} className={areaClass} />
              </SectionField>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="submit" className={secondaryButton} disabled={generating}>
              Salvar edição
            </button>
            {status === "DRAFT" ? (
              <button type="submit" formAction={markReviewed} disabled={blocked} className={`${primaryButton} disabled:opacity-50`}>
                Marcar como revisado
              </button>
            ) : null}
            {status === "REVIEWED" ? (
              <button type="submit" formAction={publishContent} disabled={blocked} className={`${primaryButton} disabled:opacity-50`}>
                Publicar na página do produto
              </button>
            ) : null}
            {status === "PUBLISHED" ? (
              <button type="submit" formAction={unpublishContent} className={dangerButton}>
                Despublicar
              </button>
            ) : null}
            {blocked ? <span className="text-xs text-bad-ink">Corrija os erros acima para avançar.</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

function SectionField({
  k,
  protectedKeys,
  issues,
  hint,
  children,
}: {
  k: SectionKey;
  protectedKeys: string[];
  issues: ContentIssue[];
  hint?: string;
  children: React.ReactNode;
}) {
  const isProtected = protectedKeys.includes(k);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-muted">{SECTION_LABELS[k]}</span>
        {isProtected ? (
          <>
            <StatusPill label="editado à mão" tone="good" />
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              <input type="checkbox" name={`release_${k}`} /> Liberar para regeneração
            </label>
          </>
        ) : (
          <button type="submit" formAction={regenerateSection.bind(null, k)} formNoValidate className="text-[11px] font-semibold text-brand hover:underline">
            Regenerar só esta seção
          </button>
        )}
      </div>
      {children}
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      {issues.map((issue, index) => (
        <span key={index} className={`text-[11px] ${issue.severity === "error" ? "text-bad-ink" : "text-warn-ink"}`}>
          {issue.message}
        </span>
      ))}
    </div>
  );
}
