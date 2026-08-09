import { Radio } from "lucide-react";
import { prisma } from "@/lib/database";
import { getUmbandaProject } from "@/lib/projects";
import { Channel, ProjectChannelType } from "@/lib/generated/prisma/client";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUmbandaChannelAction, toggleUmbandaChannelAction } from "./actions";

const TYPE_LABEL: Record<ProjectChannelType, string> = {
  PUBLIC_PAGE: "Página pública",
  PUBLIC_GROUP: "Grupo público",
  PRIVATE_GROUP: "Grupo privado",
  PROFILE: "Perfil",
};

export default async function UmbandaChannelsPage() {
  const project = await getUmbandaProject();

  const channels = await prisma.projectChannel.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova página ou grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUmbandaChannelAction} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" placeholder="Página Umbanda / Grupo X" required />
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
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" />
            </div>
            <div className="space-y-2 sm:col-span-2">
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
            Grupos privados não podem ser cadastrados aqui — a automação atua apenas sobre página e grupos públicos
            permitidos (docs/modulo-afiliados-umbanda.md).
          </p>
        </CardContent>
      </Card>

      {channels.length === 0 ? (
        <EmptyState icon={Radio} title="Nenhum canal cadastrado ainda" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const toggle = toggleUmbandaChannelAction.bind(null, c.id);
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
