import { Flame } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Channel } from "@/lib/generated/prisma/client";
import { generateContentAction } from "@/app/admin/content/actions";

export default async function OpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    where: { status: "OPEN" },
    orderBy: { score: "desc" },
    take: 30,
    include: { product: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Oportunidades" description="Produtos com maior potencial de venda identificados pelo sistema" />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Nenhuma oportunidade identificada ainda"
          description="Oportunidades são geradas automaticamente a partir do score dos produtos."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => {
            const generateContentWithId = generateContentAction.bind(null, o.productId);
            return (
              <Card key={o.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">{o.product.name}</CardTitle>
                  <Badge>{Number(o.score).toFixed(0)}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{o.type.replaceAll("_", " ")}</p>
                  {o.reason && <p>{o.reason}</p>}
                  <form action={generateContentWithId} className="flex gap-2">
                    <input type="hidden" name="channel" value={Channel.FACEBOOK} />
                    <Button type="submit" size="sm" variant="secondary">
                      Gerar conteúdo
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
