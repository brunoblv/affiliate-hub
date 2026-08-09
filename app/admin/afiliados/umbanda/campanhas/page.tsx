import { getUmbandaProject } from "@/lib/projects";
import { prisma } from "@/lib/database";
import { CampaignStatus } from "@/lib/generated/prisma/client";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone } from "lucide-react";
import { createUmbandaCampaignAction, setUmbandaCampaignStatusAction } from "./actions";

export default async function UmbandaCampaignsPage() {
  const project = await getUmbandaProject();

  const campaigns = await prisma.campaign.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true, contents: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUmbandaCampaignAction} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" placeholder="Livros de Umbanda" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="UMB-LIVROS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Input id="channel" name="channel" placeholder="FACEBOOK" />
            </div>
            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm">
                Criar campanha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhuma campanha criada ainda" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const toggle = setUmbandaCampaignStatusAction.bind(
              null,
              c.id,
              c.status === CampaignStatus.ACTIVE ? CampaignStatus.PAUSED : CampaignStatus.ACTIVE,
            );

            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {c.code && <p className="text-xs text-muted-foreground">{c.code}</p>}
                  </div>
                  <Badge variant="secondary">{c.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {c._count.products} produtos · {c._count.contents} conteúdos
                  </p>
                  <form action={toggle}>
                    <Button type="submit" size="xs" variant="outline">
                      {c.status === CampaignStatus.ACTIVE ? "Pausar" : "Ativar"}
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
