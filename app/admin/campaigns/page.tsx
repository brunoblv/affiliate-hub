import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Campanhas" description="Campanhas comerciais (Ofertas do Dia, Casa em Oferta, ...)" />

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhuma campanha criada ainda" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <Badge variant="secondary">{c.status}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c._count.products} produtos
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
