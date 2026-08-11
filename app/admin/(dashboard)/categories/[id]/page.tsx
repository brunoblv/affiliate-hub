import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCategoryAction, toggleCategoryActiveAction } from "../actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      project: true,
      parent: true,
      _count: { select: { products: true, children: true } },
    },
  });
  if (!category) notFound();

  const parentOptions = await prisma.category.findMany({
    where: {
      projectId: category.projectId,
      parentId: null,
      id: { not: category.id },
    },
    orderBy: { name: "asc" },
  });

  const update = updateCategoryAction.bind(null, category.id);
  const toggle = toggleCategoryActiveAction.bind(null, category.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={category.name}
          description={`${category.project.name} · ${category._count.products} produtos · ${category._count.children} subcategorias`}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {category.slug}
          </Badge>
          <Badge variant={category.active ? "default" : "secondary"}>
            {category.active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <form action={update} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={category.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Categoria pai</Label>
              <select
                id="parentId"
                name="parentId"
                defaultValue={category.parentId ?? ""}
                className={selectClassName}
              >
                <option value="">— Raiz (sem pai) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={category.description ?? ""} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Salvar alterações
              </Button>
              <Button size="sm" variant="outline" render={<Link href="/admin/categories" />}>
                Voltar
              </Button>
            </div>
          </form>

          <form action={toggle}>
            <Button type="submit" size="sm" variant="outline">
              {category.active ? "Desativar categoria" : "Reativar categoria"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
