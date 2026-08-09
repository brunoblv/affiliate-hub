import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Channel } from "@/lib/generated/prisma/client";
import {
  createScheduleSlotAction,
  toggleScheduleSlotAction,
  deleteScheduleSlotAction,
  runScheduleSlotNowAction,
} from "./actions";

export default async function SchedulesPage() {
  const [slots, categories, campaigns] = await Promise.all([
    prisma.scheduleSlot.findMany({ orderBy: { time: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const campaignById = new Map(campaigns.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Horários recorrentes de publicação: o sistema seleciona os melhores produtos, gera o conteúdo e agenda a publicação para aprovação (spec §25)."
      />

      {slots.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nenhum horário configurado ainda" />
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const toggleWithId = toggleScheduleSlotAction.bind(null, slot.id);
            const deleteWithId = deleteScheduleSlotAction.bind(null, slot.id);
            const runNowWithId = runScheduleSlotNowAction.bind(null, slot.id);

            return (
              <Card key={slot.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{slot.time}</span>
                      <span className="font-medium">{slot.name}</span>
                      <Badge variant="outline">{slot.channel}</Badge>
                      <Badge variant={slot.active ? "default" : "secondary"}>{slot.active ? "Ativo" : "Pausado"}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {slot.categoryId && <span>Categoria: {categoryById.get(slot.categoryId) ?? "—"}</span>}
                      {slot.campaignId && <span>Campanha: {campaignById.get(slot.campaignId) ?? "—"}</span>}
                      {slot.minScore && <span>Score mínimo: {Number(slot.minScore)}</span>}
                      {slot.minDiscount && <span>Desconto mínimo: {Number(slot.minDiscount)}%</span>}
                      {(slot.minPrice || slot.maxPrice) && (
                        <span>
                          Preço: {slot.minPrice ? Number(slot.minPrice) : 0} – {slot.maxPrice ? Number(slot.maxPrice) : "∞"}
                        </span>
                      )}
                      <span>Posts por execução: {slot.postsPerSlot}</span>
                      {slot.lastRunAt && <span>Última execução: {slot.lastRunAt.toLocaleString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={runNowWithId}>
                      <Button type="submit" size="sm" variant="secondary">
                        Rodar agora
                      </Button>
                    </form>
                    <form action={toggleWithId}>
                      <Button type="submit" size="sm" variant="outline">
                        {slot.active ? "Pausar" : "Ativar"}
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
          <CardTitle className="text-base">Novo horário</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createScheduleSlotAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" placeholder="Ofertas do Dia" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário (HH:mm) *</Label>
                <Input id="time" name="time" type="time" required />
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignId">Campanha</Label>
                <select
                  id="campaignId"
                  name="campaignId"
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
              <div className="space-y-2">
                <Label htmlFor="postsPerSlot">Quantidade de posts</Label>
                <Input id="postsPerSlot" name="postsPerSlot" type="number" min="1" defaultValue={1} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minScore">Score mínimo</Label>
                <Input id="minScore" name="minScore" type="number" min="0" max="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDiscount">Desconto mínimo (%)</Label>
                <Input id="minDiscount" name="minDiscount" type="number" min="0" max="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPrice">Preço mínimo</Label>
                <Input id="minPrice" name="minPrice" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Preço máximo</Label>
                <Input id="maxPrice" name="maxPrice" type="number" min="0" step="0.01" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Criar horário</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
