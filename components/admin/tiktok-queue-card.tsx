"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TikTokQueueItem {
  publicationId: string;
  productName: string | null;
  caption: string;
  hashtags: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  affiliateUrl: string | null;
}

export function TikTokQueueCard({
  item,
  onMarkPublished,
  onSkip,
}: {
  item: TikTokQueueItem;
  onMarkPublished: (publicationId: string) => Promise<void>;
  onSkip: (publicationId: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState<"caption" | "link" | null>(null);
  const [isPending, startTransition] = useTransition();

  const fullCaption = [item.caption, item.hashtags].filter(Boolean).join("\n\n");

  const copy = async (text: string, which: "caption" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{item.productName ?? "Post sem produto vinculado"}</CardTitle>
        <Badge variant="outline">aguardando postagem manual</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-32 w-full rounded object-cover" />
        )}
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{fullCaption}</p>
        {item.affiliateUrl && (
          <p className="truncate rounded-md border p-2 text-xs text-muted-foreground">{item.affiliateUrl}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="xs" variant="secondary" onClick={() => copy(fullCaption, "caption")}>
            {copied === "caption" ? <Check /> : <Copy />}
            {copied === "caption" ? "Copiado" : "Copiar legenda"}
          </Button>
          {item.affiliateUrl && (
            <Button type="button" size="xs" variant="secondary" onClick={() => copy(item.affiliateUrl!, "link")}>
              {copied === "link" ? <Check /> : <Copy />}
              {copied === "link" ? "Copiado" : "Copiar link"}
            </Button>
          )}
          {item.videoUrl && (
            <Button type="button" size="xs" variant="outline" render={<a href={item.videoUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              Abrir vídeo
            </Button>
          )}
          <Button
            type="button"
            size="xs"
            disabled={isPending}
            onClick={() => startTransition(() => onMarkPublished(item.publicationId))}
          >
            Marcar como publicado
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={isPending}
            onClick={() => startTransition(() => onSkip(item.publicationId))}
          >
            Ignorar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
