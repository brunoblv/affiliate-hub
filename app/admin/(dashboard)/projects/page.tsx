import Link from "next/link";
import { Briefcase } from "lucide-react";
import { prisma } from "@/lib/database";
import { ProjectType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction, toggleProjectActiveAction } from "./actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  HOME: "Casa",
  UMBANDA: "Umbanda",
  MUSICA: "Música",
};

export default async function ProjectsPage() {
  const projects = await prisma.affiliateProject.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true, categories: true, campaigns: true, channels: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        description="Cada projeto isola catálogo, campanhas e canais. Cadastre o ChartFM para vincular produtos à loja dele."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" placeholder="ChartFM" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (opcional)</Label>
              <Input id="slug" name="slug" placeholder="chartfm" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <select id="type" name="type" required defaultValue={ProjectType.MUSICA} className={selectClassName}>
                <option value={ProjectType.HOME}>{PROJECT_TYPE_LABEL.HOME}</option>
                <option value={ProjectType.UMBANDA}>{PROJECT_TYPE_LABEL.UMBANDA}</option>
                <option value={ProjectType.MUSICA}>{PROJECT_TYPE_LABEL.MUSICA}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                placeholder="Vinis, CDs e artigos de música — Loja do ChartFM"
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                Cadastrar projeto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum projeto cadastrado"
          description="Cadastre o ChartFM (tipo Música) para começar a vincular produtos à loja."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const toggle = toggleProjectActiveAction.bind(null, project.id);
            return (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">{PROJECT_TYPE_LABEL[project.type]}</Badge>
                    <Badge variant={project.active ? "default" : "secondary"}>
                      {project.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {project.description && <p>{project.description}</p>}
                  <p>
                    {project._count.products} produtos · {project._count.categories} categorias ·{" "}
                    {project._count.campaigns} campanhas · {project._count.channels} canais
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      render={<Link href={`/admin/projects/${project.id}`} />}
                    >
                      Editar
                    </Button>
                    {project.active && (
                      <Button
                        size="xs"
                        variant="outline"
                        render={<Link href={`/admin/afiliados/${project.slug}`} />}
                      >
                        Abrir
                      </Button>
                    )}
                    <form action={toggle}>
                      <Button type="submit" size="xs" variant="outline">
                        {project.active ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
