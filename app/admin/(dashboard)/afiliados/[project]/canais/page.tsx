import { Radio } from "lucide-react";
import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { Channel, ProjectChannelType } from "@/lib/generated/prisma/client";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectChannelAction, toggleProjectChannelAction } from "./actions";

const TYPE_LABEL: Record<ProjectChannelType, string> = {
  PUBLIC_PAGE: "Página pública",
  PUBLIC_GROUP: "Grupo público",
  PRIVATE_GROUP: "Grupo privado",
  PROFILE: "Perfil",
};

export default async function ProjectChannelsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  const channels = await prisma.projectChannel.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });

  const createWithSlug = createProjectChannelAction.bind(null, slug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova página ou grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWithSlug} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" placeholder={`Página ${project.name} / Grupo X`} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma</Label>
              <select
                id="platform"
                name="platform"
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
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                defaultValue={ProjectChannelType.PUBLIC_PAGE}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={ProjectChannelType.PUBLIC_PAGE}>Página pública</option>
                <option value={ProjectChannelType.PUBLIC_GROUP}>Grupo público</option>
                <option value={ProjectChannelType.PROFILE}>Perfil</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="externalPageId">ID da Página (Facebook Graph API)</Label>
              <Input id="externalPageId" name="externalPageId" placeholder="Obrigatório para publicar automaticamente" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="externalChatId">Chat ID (Telegram) / JID do grupo (WhatsApp)</Label>
              <Input
                id="externalChatId"
                name="externalChatId"
                placeholder="Telegram: npm run telegram:get-chat-id · WhatsApp: npm run whatsapp:login"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldownDays">Cooldown (dias)</Label>
              <Input id="cooldownDays" name="cooldownDays" type="number" min="0" defaultValue={7} />
            </div>
            <div className="flex items-end gap-4 sm:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowLinks" defaultChecked className="size-4" />
                Permite links
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowOffers" defaultChecked className="size-4" />
                Permite ofertas
              </label>
            </div>

            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="notes">Notas / regras do grupo</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm">
                Adicionar canal
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Página do Facebook: publicação automática via API (requer o ID da Página). Grupo público do Facebook: entra na
            Central de Grupos em fluxo assistido — o sistema não publica em grupos via API. Telegram e WhatsApp: publicação
            automática direta (requer o Chat ID / JID do grupo — veja <code>npm run telegram:get-chat-id</code> e{" "}
            <code>npm run whatsapp:login</code>). Grupos privados não podem ser cadastrados.
          </p>
        </CardContent>
      </Card>

      {channels.length === 0 ? (
        <EmptyState icon={Radio} title="Nenhum canal cadastrado ainda" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const toggle = toggleProjectChannelAction.bind(null, slug, c.id);
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {c.platform} · {TYPE_LABEL[c.type]}
                  </p>
                  {c.platform === "FACEBOOK" && c.type === "PUBLIC_PAGE" && (
                    <p className="text-xs">{c.externalPageId ? `Page ID: ${c.externalPageId}` : "⚠️ sem Page ID"}</p>
                  )}
                  {(c.platform === "TELEGRAM" || c.platform === "WHATSAPP") && (
                    <p className="text-xs">{c.externalChatId ? `Chat ID: ${c.externalChatId}` : "⚠️ sem Chat ID / JID"}</p>
                  )}
                  <p className="text-xs">Cooldown: {c.cooldownDays}d</p>
                  {c.notes && <p className="text-xs">{c.notes}</p>}
                  <form action={toggle}>
                    <Button type="submit" size="xs" variant="outline">
                      {c.active ? "Desativar" : "Reativar"}
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
