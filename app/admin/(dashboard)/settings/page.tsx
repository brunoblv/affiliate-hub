import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Parâmetros gerais do sistema, incluindo pesos do score" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesos do Score (padrão)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
          <span>Desconto: 20%</span>
          <span>Avaliação: 20%</span>
          <span>Vendas: 15%</span>
          <span>Comissão: 15%</span>
          <span>Preço: 10%</span>
          <span>Tendência: 10%</span>
          <span>Conversão: 10%</span>
        </CardContent>
      </Card>

      {settings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurações salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {settings.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span className="text-muted-foreground">{s.key}</span>
                <span>{JSON.stringify(s.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
