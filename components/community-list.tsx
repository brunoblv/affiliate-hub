import { prisma } from "@/lib/db";
import { communityTypes } from "@/lib/communities/validation";

export async function CommunityList({ nicheId, productId }: { nicheId?: string; productId?: string }) {
  const communities = await prisma.community.findMany({
    where: { active: true, nicheId, niche: { active: true, ...(productId ? { products: { some: { productId } } } : {}) } },
    include: { niche: { select: { name: true } } },
    orderBy: [{ niche: { position: "asc" } }, { position: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  if (!communities.length) return nicheId || productId ? null : <p className="mt-6 text-muted">Ainda não há comunidades disponíveis. Você pode continuar pesquisando e comparando preços.</p>;
  return <section className="mt-10" aria-label="Comunidades por interesse">
    <h2 className="text-xl font-bold">Comunidades por interesse</h2>
    <p className="mt-2 text-sm text-muted">Escolha um grupo ou canal para acompanhar. A participação é opcional.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => <article key={community.id} className="rounded-xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold text-brand">{community.niche.name} · {communityTypes[`${community.platform}_${community.kind}`]}</p>
        <h3 className="mt-2 font-bold">{community.name}</h3>
        <a href={`/comunidades/entrar/${community.id}`} target="_blank" rel="nofollow noopener noreferrer" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark">{community.kind === "GROUP" ? "Entrar no grupo" : "Acessar canal"}<span className="sr-only"> {community.name} (nova aba)</span></a>
      </article>)}
    </div>
  </section>;
}
