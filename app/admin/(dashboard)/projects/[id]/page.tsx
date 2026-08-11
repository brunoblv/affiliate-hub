import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { ProjectType } from "@/lib/generated/prisma/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectAction, toggleProjectActiveAction } from "../actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  HOME: "Casa",
  UMBANDA: "Umbanda",
  MUSICA: "Música",
};

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.affiliateProject.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true, categories: true, campaigns: true, channels: true },
      },
    },
  });
  if (!project) notFound();

  const update = updateProjectAction.bind(null, project.id);
  const toggle = toggleProjectActiveAction.bind(null, project.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={project.name}
          description={`${project._count.products} produtos · ${project._count.categories} categorias · ${project._count.campaigns} campanhas`}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {project.slug}
          </Badge>
          <Badge variant="outline">{PROJECT_TYPE_LABEL[project.type]}</Badge>
          <Badge variant={project.active ? "default" : "secondary"}>
            {project.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <form action={update} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={project.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <select id="type" name="type" required defaultValue={project.type} className={selectClassName}>
                <option value={ProjectType.HOME}>{PROJECT_TYPE_LABEL.HOME}</option>
                <option value={ProjectType.UMBANDA}>{PROJECT_TYPE_LABEL.UMBANDA}</option>
                <option value={ProjectType.MUSICA}>{PROJECT_TYPE_LABEL.MUSICA}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={project.description ?? ""} />
            </div>

            <p className="text-xs text-muted-foreground">
              O slug <span className="font-mono">{project.slug}</span> não pode ser alterado (é usado nas
              URLs do admin e nas associações de produtos).
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Salvar alterações
              </Button>
              <Button size="sm" variant="outline" render={<Link href="/admin/projects" />}>
                Voltar
              </Button>
              {project.active && (
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/admin/afiliados/${project.slug}`} />}
                >
                  Abrir projeto
                </Button>
              )}
            </div>
          </form>

          <form action={toggle}>
            <Button type="submit" size="sm" variant="outline">
              {project.active ? "Desativar projeto" : "Reativar projeto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
