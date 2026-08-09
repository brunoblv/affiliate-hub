import { LayoutTemplate } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TemplatesPage() {
  const templates = await prisma.contentTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Modelos de texto reutilizáveis por canal" />

      {templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="Nenhum template cadastrado" description="Crie templates específicos para Facebook, Instagram, TikTok, Telegram e Blog." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge variant="outline">{t.channel}</Badge>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{t.template}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
