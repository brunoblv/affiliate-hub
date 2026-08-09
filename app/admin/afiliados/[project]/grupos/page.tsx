import { Users } from "lucide-react";
import { getProjectBySlug } from "@/lib/projects";
import { prisma } from "@/lib/database";
import { EmptyState } from "@/components/admin/empty-state";
import { GroupQueueCard } from "@/components/admin/group-queue-card";
import { markGroupPublicationPublishedAction, skipGroupPublicationAction } from "./actions";

export default async function ProjectGroupQueuePage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const publications = await prisma.publication.findMany({
    where: {
      assisted: true,
      status: "QUEUED",
      content: { projectId: project.id },
    },
    orderBy: { createdAt: "desc" },
    include: { content: true, projectChannel: true },
  });

  const markPublished = markGroupPublicationPublishedAction.bind(null, slug);
  const skip = skipGroupPublicationAction.bind(null, slug);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Fila de publicações para grupos do Facebook (fluxo assistido): copie o texto, abra o grupo, publique manualmente e
        marque como publicado. O sistema não publica em grupos automaticamente.
      </p>

      {publications.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma publicação aguardando na fila de grupos" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {publications.map((p) => (
            <GroupQueueCard
              key={p.id}
              item={{
                publicationId: p.id,
                groupName: p.projectChannel?.name ?? "Grupo",
                groupUrl: p.projectChannel?.url ?? null,
                text: p.content.caption ?? [p.content.title, p.content.description].filter(Boolean).join("\n\n"),
                imageUrl: p.content.imageUrl,
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
