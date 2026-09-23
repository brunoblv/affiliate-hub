import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { ErrorBanner, Field, PageHeader, Panel, inputClass, primaryButton } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { saveCommunity } from "@/lib/admin/community-actions";
import { communityTypes } from "@/lib/communities/validation";
import type { Community } from "@/lib/generated/prisma/client";
import { asText, type RawParams } from "@/lib/query";

export const metadata: Metadata = { title: "Comunidades · Admin", robots: { index: false, follow: false } };

export default async function AdminCommunitiesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const [niches, communities] = await Promise.all([
    prisma.niche.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, active: true } }),
    prisma.community.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { clicks: true } } } }),
  ]);
  return <AdminShell active="Comunidades">
    <PageHeader title="Comunidades" subtitle="Convites por nicho · cliques não comprovam adesão" />
    <ErrorBanner message={asText(params.erro)} />
    {params.salvo ? <p role="status" className="mb-4 text-sm text-good">Comunidade salva.</p> : null}
    <p className="mb-6 text-sm text-muted">O identificador de publicação é opcional. Cadastrar um convite não ativa postagem automática. Desative um destino para retirar o convite e preservar seu histórico.</p>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4">
        {!communities.length ? <p className="text-muted">Nenhuma comunidade cadastrada.</p> : null}
        {communities.map((community) => <Panel key={community.id} title={`${community.name} · ${community._count.clicks} cliques de entrada`}>
          <CommunityForm niches={niches} community={community} />
        </Panel>)}
      </div>
      <Panel title="Nova comunidade">{niches.length ? <CommunityForm niches={niches} /> : <p className="text-sm text-muted">Cadastre um nicho em Categorias para começar.</p>}</Panel>
    </div>
  </AdminShell>;
}

function CommunityForm({ niches, community }: { niches: { id: string; name: string; active: boolean }[]; community?: Community }) {
  return <form action={saveCommunity} className="grid gap-3">
    {community ? <input type="hidden" name="id" value={community.id} /> : null}
    <Field label="Nome"><input name="name" required maxLength={120} defaultValue={community?.name} className={inputClass} /></Field>
    <Field label="Nicho"><select name="nicheId" required defaultValue={community?.nicheId ?? ""} className={inputClass}>
      <option value="" disabled>Selecione um nicho</option>
      {niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}{niche.active ? "" : " (inativo)"}</option>)}
    </select></Field>
    <Field label="Tipo"><select name="type" defaultValue={community ? `${community.platform}_${community.kind}` : "WHATSAPP_GROUP"} className={inputClass}>
      {Object.entries(communityTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></Field>
    <Field label="Link público de convite"><input name="inviteUrl" type="url" required defaultValue={community?.inviteUrl} placeholder="https://chat.whatsapp.com/..." className={inputClass} /></Field>
    <Field label="Identificador de publicação (opcional)"><input name="publicationId" maxLength={200} defaultValue={community?.publicationId ?? ""} className={inputClass} /></Field>
    <Field label="Ordem"><input name="position" type="number" min={0} max={10000} defaultValue={community?.position ?? 0} className={inputClass} /></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={community?.active ?? false} />Convite ativo no site</label>
    <button className={primaryButton} type="submit">{community ? "Salvar comunidade" : "Adicionar comunidade"}</button>
  </form>;
}
