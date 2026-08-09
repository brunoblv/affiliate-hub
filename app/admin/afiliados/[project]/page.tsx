import { Package, Megaphone, Radio, Send, MousePointerClick, DollarSign, Link2Off } from "lucide-react";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const [productCount, pendingLinkCount, campaignCount, channelCount, publicationCount, clicks, categories] =
    await Promise.all([
      prisma.product.count({ where: { projectId: project.id } }),
      prisma.productSource.count({ where: { affiliateUrl: null, product: { projectId: project.id } } }),
      prisma.campaign.count({ where: { projectId: project.id } }),
      prisma.projectChannel.count({ where: { projectId: project.id, active: true } }),
      prisma.publication.count({ where: { content: { projectId: project.id } } }),
      prisma.click.findMany({
        where: { affiliateLink: { product: { projectId: project.id } } },
        select: { id: true, affiliateLink: { select: { commission: true } } },
      }),
      prisma.category.findMany({
        where: { projectId: project.id },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      }),
    ]);

  const commission = clicks.reduce((sum, c) => sum + Number(c.affiliateLink.commission ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Produtos cadastrados" value={productCount} />
        <StatCard icon={Link2Off} label="Sem link de afiliado" value={pendingLinkCount} />
        <StatCard icon={Megaphone} label="Campanhas" value={campaignCount} />
        <StatCard icon={Radio} label="Canais ativos" value={channelCount} />
        <StatCard icon={Send} label="Publicações" value={publicationCount} />
        <StatCard icon={MousePointerClick} label="Cliques" value={clicks.length} />
        <StatCard
          icon={DollarSign}
          label="Comissão acumulada"
          value={commission.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{c.name}</span>
              <span className="text-muted-foreground">{c._count.products}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
