import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommunityList } from "@/components/community-list";

export const metadata: Metadata = { title: "Comunidades", alternates: { canonical: "/comunidades" } };
export const dynamic = "force-dynamic";

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ indisponivel?: string }> }) {
  const { indisponivel } = await searchParams;
  return <><SiteHeader /><main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-8">
    <h1 className="text-3xl font-bold">Comunidades</h1>
    <p className="mt-3 text-muted">Grupos e canais de WhatsApp e Telegram organizados pelos seus interesses.</p>
    {indisponivel ? <p role="status" className="mt-5 rounded-lg border border-line p-4">Este convite está indisponível. Confira as comunidades ativas abaixo ou continue pela busca.</p> : null}
    <CommunityList />
  </main><SiteFooter /></>;
}
