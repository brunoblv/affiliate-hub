import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHANNELS = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "TELEGRAM", "WEBSITE", "BLOG", "PINTEREST", "OUTROS"] as const;

export default async function ChannelsPage() {
  const linkCounts = await prisma.affiliateLink.groupBy({ by: ["channel"], _count: { _all: true } });
  const countByChannel = new Map(linkCounts.map((c) => [c.channel, c._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader title="Canais" description="Canais de distribuição disponíveis para divulgação" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((channel) => (
          <Card key={channel}>
            <CardHeader>
              <CardTitle className="text-base">{channel}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {countByChannel.get(channel) ?? 0} links de afiliado
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
