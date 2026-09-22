import { StatusPill } from "@/components/admin-shell";
import { EmptyRow, Panel, dangerButton, primaryButton, secondaryButton } from "@/components/admin-ui";
import { approveCreative, createCreatives, deleteCreative } from "@/lib/admin/creative-actions";
import { FORMATS, type FormatKey } from "@/lib/creatives/render";
import { money } from "@/lib/format";
import type { Creative } from "@/lib/generated/prisma/client";

const STATUS = {
  PENDING_APPROVAL: { label: "Aguardando aprovação", tone: "warn" },
  APPROVED: { label: "Aprovada", tone: "good" },
  PUBLISHED: { label: "Publicada", tone: "good" },
  INVALIDATED: { label: "Sem validade", tone: "bad" },
} as const;

const date = (value: Date) => value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export function CreativesTab({
  productId,
  creatives,
  hasPhoto,
}: {
  productId: string;
  creatives: Creative[];
  hasPhoto: boolean;
}) {
  const active = creatives.filter((creative) => creative.status !== "INVALIDATED");
  const history = creatives.filter((creative) => creative.status === "INVALIDATED");

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <Panel title="Gerar capas">
        <p className="mb-3 text-xs text-muted">
          A composição é automática e usa a <strong>foto real</strong> do produto: nada é redesenhado por IA. Saem 4 formatos: 1200×630
          (compartilhamento), 1080×1350 (feed), 1080×1920 (stories) e 1080×1080 (quadrado).
        </p>
        {hasPhoto ? null : (
          <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-ink">Cadastre uma foto na aba Imagens para gerar capas.</p>
        )}
        <form action={createCreatives} className="flex flex-col gap-3.5">
          <input type="hidden" name="productId" value={productId} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted">Conteúdo da capa</legend>
            <label className="flex items-start gap-2 text-[13px]">
              <input type="radio" name="mode" value="sem" defaultChecked className="mt-1" />
              <span>
                <strong>Sem preço</strong> — vale enquanto a foto e o nome não mudarem.
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px]">
              <input type="radio" name="mode" value="preco" className="mt-1" />
              <span>
                <strong>Com o menor preço de agora</strong> — datado e com “confirme na loja”. Perde a validade sozinha se o preço mudar
                antes de ser publicada.
              </span>
            </label>
          </fieldset>
          <div>
            <button type="submit" disabled={!hasPhoto} className={`${primaryButton} disabled:opacity-50`}>
              Gerar nos 4 formatos
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={`Capas (${active.length})`}>
        {active.length === 0 ? (
          <div className="rounded-[10px] border border-line">
            <EmptyRow>Nenhuma capa ainda.</EmptyRow>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {active.map((creative) => (
              <CreativeCard key={creative.id} creative={creative} />
            ))}
          </div>
        )}
      </Panel>

      {history.length > 0 ? (
        <details className="rounded-xl border border-line bg-surface p-5">
          <summary className="cursor-pointer text-[15px] font-bold">Histórico: capas sem validade ({history.length})</summary>
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {history.map((creative) => (
              <CreativeCard key={creative.id} creative={creative} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function CreativeCard({ creative }: { creative: Creative }) {
  const status = STATUS[creative.status];
  const invalid = creative.status === "INVALIDATED";
  return (
    <figure className="flex flex-col gap-2.5 rounded-[10px] border border-line p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/admin/criativos/${creative.id}`}
        alt={`Capa ${FORMATS[creative.format as FormatKey]?.label ?? creative.format}`}
        loading="lazy"
        width={creative.width}
        height={creative.height}
        className={`w-full rounded-lg border border-line-soft bg-canvas object-contain ${invalid ? "opacity-40" : ""}`}
        style={{ aspectRatio: `${creative.width} / ${creative.height}`, maxHeight: 320 }}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={status.label} tone={status.tone} />
        <span className="text-[11px] text-muted">{FORMATS[creative.format as FormatKey]?.label ?? creative.format}</span>
      </div>
      <p className="text-[11px] text-muted">
        Gerada em {date(creative.createdAt)} · modelo {creative.template} v{creative.templateVersion}
      </p>
      {creative.withPrice && creative.priceCents !== null && creative.priceObservedAt ? (
        <p className="text-[11px] text-muted">
          Mostra <strong className="text-ink">{money(creative.priceCents)}</strong>, observado em {date(creative.priceObservedAt)}
        </p>
      ) : (
        <p className="text-[11px] text-muted">Sem preço na imagem.</p>
      )}
      {creative.invalidatedReason ? <p className="text-[11px] text-bad-ink">{creative.invalidatedReason}</p> : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {creative.status === "PENDING_APPROVAL" ? (
          <form action={approveCreative}>
            <input type="hidden" name="id" value={creative.id} />
            <button type="submit" className={secondaryButton}>
              Aprovar
            </button>
          </form>
        ) : null}
        <a href={`/admin/criativos/${creative.id}?baixar=1`} className={`${secondaryButton} flex items-center`}>
          Baixar
        </a>
        {creative.status === "PUBLISHED" ? null : (
          <form action={deleteCreative}>
            <input type="hidden" name="id" value={creative.id} />
            <button type="submit" className={dangerButton}>
              Remover
            </button>
          </form>
        )}
      </div>
    </figure>
  );
}
