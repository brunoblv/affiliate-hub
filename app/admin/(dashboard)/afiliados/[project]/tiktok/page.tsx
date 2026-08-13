import Link from "next/link";
import { Video, Plus } from "lucide-react";
import { getProjectBySlug } from "@/lib/projects";
import { prisma } from "@/lib/database";
import { EmptyState } from "@/components/admin/empty-state";
import { TikTokQueueCard } from "@/components/admin/tiktok-queue-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markTikTokPublicationPublishedAction, skipTikTokPublicationAction } from "./actions";

export default async function ProjectTikTokQueuePage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const publications = await prisma.publication.findMany({
    where: {
      assisted: true,
      status: "QUEUED",
      channel: "TIKTOK",
      content: { projectId: project.id },
    },
    orderBy: { createdAt: "desc" },
    include: { content: { include: { product: true } } },
  });

  const markPublished = markTikTokPublicationPublishedAction.bind(null, slug);
  const skip = skipTikTokPublicationAction.bind(null, slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Fila de posts do TikTok (fluxo assistido): o TikTok Shop não tem versão web pra automatizar, então cadastre
          aqui as informações do post, copie a legenda/link no app e marque como publicado. O sistema não posta
          automaticamente.
        </p>
        <Link href={`/admin/afiliados/${slug}/tiktok/nova`} className={cn(buttonVariants({ size: "sm" }))}>
          <Plus />
          Novo post
        </Link>
      </div>

      {publications.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhum post do TikTok aguardando na fila"
          description="Cadastre um post pra ver ele aparecer aqui."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {publications.map((p) => (
            <TikTokQueueCard
              key={p.id}
              item={{
                publicationId: p.id,
                productName: p.content.product?.name ?? null,
                caption: p.content.caption ?? "",
                hashtags: p.content.hashtags,
                imageUrl: p.content.imageUrl,
                videoUrl: p.content.videoUrl,
                affiliateUrl: p.content.description,
              }}
              onMarkPublished={markPublished}
              onSkip={skip}
            />
          ))}
        </div>
      )}
    </div>
  );
}
