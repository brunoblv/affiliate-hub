import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ContentStatus } from "@/lib/generated/prisma/client";
import {
  updateContentAction,
  regenerateContentAction,
  duplicateContentAction,
  setContentStatusAction,
  publishNowAction,
} from "../actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  PUBLISHED: "default",
};

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      product: true,
      campaign: true,
      publications: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!content) notFound();

  const updateWithId = updateContentAction.bind(null, content.id);
  const regenerateWithId = regenerateContentAction.bind(null, content.id);
  const duplicateWithId = duplicateContentAction.bind(null, content.id);
  const approveWithId = setContentStatusAction.bind(null, content.id, ContentStatus.APPROVED);
  const rejectWithId = setContentStatusAction.bind(null, content.id, ContentStatus.REJECTED);
  const publishNowWithId = publishNowAction.bind(null, content.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={content.title ?? "Conteúdo sem título"}
          description={content.product ? `Produto: ${content.product.name}` : content.campaign ? `Campanha: ${content.campaign.name}` : undefined}
        />
        <Badge variant={STATUS_VARIANT[content.status]}>{content.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={approveWithId}>
          <Button type="submit" variant="default" size="sm" disabled={content.status === ContentStatus.APPROVED}>
            Aprovar
          </Button>
        </form>
        <form action={rejectWithId}>
          <Button type="submit" variant="outline" size="sm" disabled={content.status === ContentStatus.REJECTED}>
            Rejeitar
          </Button>
        </form>
        <form action={regenerateWithId}>
          <Button type="submit" variant="outline" size="sm">
            Regenerar texto
          </Button>
        </form>
        <form action={duplicateWithId}>
          <Button type="submit" variant="outline" size="sm">
            Duplicar conteúdo
          </Button>
        </form>
        <form action={publishNowWithId}>
          <Button type="submit" size="sm">
            Publicar imediatamente
          </Button>
        </form>
      </div>

      {content.imageUrl && (
        <Card>
          <CardContent className="pt-6">
            <Image
              src={content.imageUrl}
              alt={content.title ?? ""}
              width={480}
              height={480}
              className="mx-auto max-h-80 w-auto rounded-md object-contain"
              unoptimized
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" defaultValue={content.title ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={content.description ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption">Legenda / CTA</Label>
              <textarea
                id="caption"
                name="caption"
                rows={4}
                defaultValue={content.caption ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags</Label>
              <Input id="hashtags" name="hashtags" defaultValue={content.hashtags ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da imagem</Label>
              <Input id="imageUrl" name="imageUrl" type="url" defaultValue={content.imageUrl ?? ""} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {content.publications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publicações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {content.publications.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{p.channel}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.publishedAt ? p.publishedAt.toLocaleString("pt-BR") : p.createdAt.toLocaleString("pt-BR")}
                  </p>
                  {p.error && <p className="text-xs text-destructive">{p.error}</p>}
                </div>
                <Badge variant={p.status === "PUBLISHED" ? "default" : p.status === "FAILED" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
