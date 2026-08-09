"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface GroupQueueItem {
  publicationId: string;
  groupName: string;
  groupUrl: string | null;
  text: string;
  imageUrl: string | null;
}

export function GroupQueueCard({
  item,
  onMarkPublished,
  onSkip,
}: {
  item: GroupQueueItem;
  onMarkPublished: (publicationId: string) => Promise<void>;
  onSkip: (publicationId: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{item.groupName}</CardTitle>
        <Badge variant="outline">aguardando ação manual</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-32 w-full rounded object-cover" />
        )}
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{item.text}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="xs" variant="secondary" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiado" : "Copiar texto"}
          </Button>
          {item.groupUrl && (
            <Button type="button" size="xs" variant="outline" render={<a href={item.groupUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              Abrir grupo
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
