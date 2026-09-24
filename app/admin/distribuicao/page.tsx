import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import { ErrorBanner, Field, PageHeader, Panel, inputClass, primaryButton, secondaryButton } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin/guard";
import { prisma } from "@/lib/db";
import { asText, type RawParams } from "@/lib/query";
import { money } from "@/lib/format";
import { prepareDistribution, approveDistribution, cancelDistribution, resolveDistribution } from "@/lib/admin/distribution-actions";
import { distributionEnabled } from "@/lib/distribution/rules";

export const metadata: Metadata = { title: "Distribuição · Admin", robots: { index: false, follow: false } };
const statusLabel = { DRAFT: "Rascunho", QUEUED: "Agendada", SENDING: "Enviando", SENT: "Enviada", FAILED: "Falhou", UNCERTAIN: "Resultado incerto", CANCELED: "Cancelada" } as const;
const date = (value: Date | null) => value?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) ?? "—";

export default async function DistributionPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const productId = asText(params.produto) || "";
  const q = (asText(params.q) || "").slice(0, 120);
  const page = Math.min(10000, Math.max(1, Number.parseInt(asText(params.pagina) || "1", 10) || 1));
  const [products, product, communities, rows, total] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED", ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) }, orderBy: { name: "asc" }, take: 50, select: { id: true, name: true } }),
    productId ? prisma.product.findUnique({ where: { id: productId }, include: { niches: true, variants: { include: { offers: { where: { active: true }, include: { store: true, links: { where: { active: true } } } } } }, creatives: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, orderBy: { createdAt: "desc" }, take: 20 } } }) : null,
    prisma.community.findMany({ where: { active: true, platform: "TELEGRAM", niche: { active: true } }, include: { niche: true }, orderBy: { name: "asc" } }),
    prisma.publication.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30, include: { community: true, attempts: { orderBy: { createdAt: "desc" }, take: 10 } } }),
    prisma.publication.count(),
  ]);
  return <AdminShell active="Distribuição">
    <PageHeader title="Distribuição" subtitle="Prepare, revise e agende ofertas para o Telegram" />
    <ErrorBanner message={asText(params.erro)} />
    {params.salvo ? <p role="status" className="mb-4 text-sm text-good">Alteração salva.</p> : null}
    <p className="mb-5 rounded-xl border border-line bg-surface p-4 text-sm">
      {distributionEnabled() && process.env.TELEGRAM_BOT_TOKEN ? "Envio habilitado: o worker publica somente ofertas aprovadas e agendadas." : "Envio pausado. Você pode preparar e agendar; o worker só enviará após habilitar DISTRIBUTION_ENABLED e configurar TELEGRAM_BOT_TOKEN."}
      {" "}Máximo de 3 ofertas/dia por destino, intervalo mínimo de 1 hora e bloqueio de produtos semelhantes por 7 dias. Horários de São Paulo.
    </p>
    <Panel title="Preparar publicação">
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/distribuicao">
        <input name="q" defaultValue={q} placeholder="Pesquisar produto pelo nome" aria-label="Pesquisar produto" className={`${inputClass} max-w-sm`} />
        <button className={secondaryButton}>Pesquisar</button>
      </form>
      <form action="/admin/distribuicao" className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="q" value={q} />
        <select name="produto" aria-label="Produto" defaultValue={productId} className={`${inputClass} max-w-lg`} required>
          <option value="">Escolha um produto publicado</option>
          {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select><button className={secondaryButton}>Selecionar</button>
      </form>
      {product ? <form action={prepareDistribution} className="grid gap-4 md:grid-cols-2">
        <Field label={`Oferta e link de ${product.name}`}><select name="linkId" required className={inputClass}>
          <option value="">Selecione a oferta exata</option>
          {product.variants.flatMap((variant) => variant.offers.flatMap((offer) => offer.links.map((link) => <option key={link.id} value={link.id}>{variant.label} · {offer.store.name} · {offer.sellerName} · {offer.priceCents ? money(offer.priceCents) : "Sem preço"} · {link.label || link.shortCode}</option>)))}
        </select></Field>
        <Field label="Destino Telegram"><select name="communityId" required className={inputClass}>
          <option value="">Selecione uma comunidade do nicho</option>
          {communities.filter((item) => product.niches.some((n) => n.nicheId === item.nicheId)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.niche.name}</option>)}
        </select></Field>
        <Field label="Capa aprovada (opcional)"><select name="creativeId" className={inputClass}>
          <option value="">Somente texto</option>
          {product.creatives.map((item) => <option key={item.id} value={item.id}>{item.format} · {item.withPrice ? money(item.priceCents ?? 0) : "Sem preço"} · {date(item.createdAt)}</option>)}
        </select></Field>
        <div className="flex items-end"><button className={primaryButton}>Preparar prévia para revisão</button></div>
      </form> : <p className="text-sm text-muted">Selecione um produto para escolher uma oferta e uma comunidade. Nenhum envio acontece ao preparar uma prévia.</p>}
    </Panel>
    <div className="mt-6 grid gap-5">
      <h2 className="text-xl font-bold">Fila e histórico · {total} registros</h2>
      {!rows.length ? <p className="text-muted">Nenhuma publicação preparada.</p> : null}
      {rows.map((row) => <Panel key={row.id} title={`${row.title} → ${row.community.name}`}>
        <StatusPill label={statusLabel[row.status]} tone={row.status === "SENT" ? "good" : row.status === "FAILED" || row.status === "UNCERTAIN" ? "bad" : "neutral"} />
        <p className="my-3 text-xs text-muted">Destino aprovado: {row.targetId} · Agendada: {date(row.scheduledFor)} · Enviada: {date(row.sentAt)} · Tipo: {row.contentType}{row.externalId ? ` · Mensagem: ${row.externalId}` : ""}</p>
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-canvas p-4 font-sans text-sm">{row.text}</pre>
        {row.creativeId ? <a href={`/admin/criativos/${row.creativeId}`} target="_blank" rel="noopener" className="my-3 inline-block text-sm font-semibold text-brand">Conferir capa aprovada (nova aba)</a> : null}
        {row.error ? <p role="status" className="mt-3 text-sm text-bad">{row.error}</p> : null}
        {row.status === "DRAFT" ? <form action={approveDistribution} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={row.id} />
          <Field label="Data e hora · São Paulo"><input type="datetime-local" name="scheduledFor" required className={inputClass} /></Field>
          <label className="text-sm"><input type="checkbox" name="approved" required /> Revisei destino, texto e capa e autorizo o envio agendado.</label>
          <button className={primaryButton}>Aprovar e agendar envio</button>
        </form> : null}
        {["DRAFT", "QUEUED", "FAILED"].includes(row.status) ? <form action={cancelDistribution} className="mt-3"><input type="hidden" name="id" value={row.id} /><button className={secondaryButton}>Cancelar publicação</button></form> : null}
        {row.status === "UNCERTAIN" ? <form action={resolveDistribution} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />
          <Field label="Resultado conferido no Telegram"><select name="result" className={inputClass}><option value="sent">A mensagem foi publicada</option><option value="not-sent">Não foi publicada; cancelar registro</option></select></Field>
          <Field label="ID da mensagem publicada"><input name="externalId" inputMode="numeric" className={inputClass} /></Field>
          <label className="text-sm"><input type="checkbox" name="checked" required /> Conferi manualmente o histórico do destino.</label><button className={secondaryButton}>Registrar resultado sem reenviar</button>
        </form> : null}
        {row.attempts.length ? <details className="mt-4 text-xs"><summary className="cursor-pointer font-semibold">Histórico de tentativas</summary><ul className="mt-2 space-y-2">{row.attempts.map((attempt) => <li key={attempt.id}>{date(attempt.createdAt)} · {statusLabel[attempt.status]} · {attempt.detail || attempt.externalId || "—"}</li>)}</ul></details> : null}
      </Panel>)}
      <nav aria-label="Páginas do histórico" className="flex gap-4 text-sm text-brand">
        {page > 1 ? <Link href={`/admin/distribuicao?pagina=${page - 1}`}>Anterior</Link> : null}
        {page * 30 < total ? <Link href={`/admin/distribuicao?pagina=${page + 1}`}>Próxima</Link> : null}
      </nav>
    </div>
  </AdminShell>;
}
