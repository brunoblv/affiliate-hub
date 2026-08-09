import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutopilotMode, Channel } from "@/lib/generated/prisma/client";
import {
  createAutopilotRuleAction,
  toggleAutopilotRuleAction,
  deleteAutopilotRuleAction,
  runAutopilotRuleNowAction,
} from "../actions";

export default async function AutopilotRulesPage() {
  const [rules, campaigns] = await Promise.all([
    prisma.autopilotRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
  ]);

  const campaignById = new Map(campaigns.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <PageHeader title="Regras do Autopilot" description="Condições que definem seleção e publicação automática de produtos" />

      {rules.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma regra configurada"
          description="Ex.: score >= 90 E desconto >= 30% E avaliação >= 4.6 E comissão >= 5% → gerar conteúdo e agendar."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rules.map((rule) => {
            const toggleWithId = toggleAutopilotRuleAction.bind(null, rule.id);
            const deleteWithId = deleteAutopilotRuleAction.bind(null, rule.id);
            const runNowWithId = runAutopilotRuleNowAction.bind(null, rule.id);

            return (
              <Card key={rule.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{rule.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rule.channel}</Badge>
                    <Badge variant={rule.active ? "default" : "outline"}>{rule.active ? "Ativa" : "Inativa"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Modo: {rule.mode.replaceAll("_", " ")}</p>
                    {rule.minScore && <p>Score mínimo: {Number(rule.minScore)}</p>}
                    {rule.minDiscount && <p>Desconto mínimo: {Number(rule.minDiscount)}%</p>}
                    {rule.minRating && <p>Avaliação mínima: {Number(rule.minRating)}</p>}
                    {rule.minCommission && <p>Comissão mínima: {Number(rule.minCommission)}%</p>}
                    {rule.minSales && <p>Vendas mínimas: {rule.minSales}</p>}
                    {rule.maxPublicationsPerDay && <p>Máx. publicações/dia: {rule.maxPublicationsPerDay}</p>}
                    {rule.targetCampaignId && <p>Campanha: {campaignById.get(rule.targetCampaignId) ?? "—"}</p>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {rule.mode === AutopilotMode.AUTOMATIC && (
                      <form action={runNowWithId}>
                        <Button type="submit" size="sm" variant="secondary">
                          Rodar agora
                        </Button>
                      </form>
                    )}
                    <form action={toggleWithId}>
                      <Button type="submit" size="sm" variant="outline">
                        {rule.active ? "Pausar" : "Ativar"}
                      </Button>
                    </form>
                    <form action={deleteWithId}>
                      <Button type="submit" size="sm" variant="outline">
                        Remover
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova regra</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAutopilotRuleAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" placeholder="Ofertas de alto score" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">Modo *</Label>
                <select
                  id="mode"
                  name="mode"
                  defaultValue={AutopilotMode.AUTOMATIC}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.values(AutopilotMode).map((m) => (
                    <option key={m} value={m}>
                      {m.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Canal *</Label>
                <select
                  id="channel"
                  name="channel"
                  defaultValue={Channel.FACEBOOK}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.values(Channel).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minScore">Score mínimo</Label>
                <Input id="minScore" name="minScore" type="number" min="0" max="100" placeholder="90" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDiscount">Desconto mínimo (%)</Label>
                <Input id="minDiscount" name="minDiscount" type="number" min="0" max="100" placeholder="30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minRating">Avaliação mínima</Label>
                <Input id="minRating" name="minRating" type="number" min="0" max="5" step="0.1" placeholder="4.6" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minCommission">Comissão mínima (%)</Label>
                <Input id="minCommission" name="minCommission" type="number" min="0" placeholder="5" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minSales">Vendas mínimas</Label>
                <Input id="minSales" name="minSales" type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPrice">Preço mínimo</Label>
                <Input id="minPrice" name="minPrice" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Preço máximo</Label>
                <Input id="maxPrice" name="maxPrice" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPublicationsPerDay">Máx. publicações/dia</Label>
                <Input id="maxPublicationsPerDay" name="maxPublicationsPerDay" type="number" min="1" defaultValue={10} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allowedCategoryIds">Categorias permitidas (IDs, separados por vírgula)</Label>
                <Input id="allowedCategoryIds" name="allowedCategoryIds" placeholder="Deixe em branco para permitir todas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockedCategoryIds">Categorias bloqueadas (IDs, separados por vírgula)</Label>
                <Input id="blockedCategoryIds" name="blockedCategoryIds" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCampaignId">Campanha de destino</Label>
              <select
                id="targetCampaignId"
                name="targetCampaignId"
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Nenhuma</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Criar regra</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
