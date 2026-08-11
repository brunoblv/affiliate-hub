import Link from "next/link";
import { FolderTree } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategoryAction, toggleCategoryActiveAction } from "./actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function CategoriesPage() {
  const [projects, parentOptions, roots] = await Promise.all([
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ project: { name: "asc" } }, { name: "asc" }],
      include: { project: true },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ project: { name: "asc" } }, { name: "asc" }],
      include: {
        project: true,
        children: {
          orderBy: { name: "asc" },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    }),
  ]);

  const byProject = Map.groupBy(roots, (c) => c.project.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Cadastre e organize a taxonomia hierárquica de produtos por projeto."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategoryAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto *</Label>
              <select
                id="projectId"
                name="projectId"
                required
                defaultValue={projects[0]?.id}
                className={selectClassName}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Categoria pai</Label>
              <select id="parentId" name="parentId" defaultValue="" className={selectClassName}>
                <option value="">— Raiz (sem pai) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.project.name} › {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" placeholder="Cozinha" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (opcional)</Label>
              <Input id="slug" name="slug" placeholder="cozinha" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" placeholder="Produtos para a cozinha" />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={projects.length === 0}>
                Cadastrar categoria
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {roots.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Nenhuma categoria cadastrada"
          description="Use o formulário acima para criar a primeira categoria."
        />
      ) : (
        <div className="space-y-8">
          {[...byProject.entries()].map(([projectName, categories]) => (
            <section key={projectName} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">{projectName}</h2>
              <div className="space-y-3">
                {categories.map((c) => {
                  const toggle = toggleCategoryActiveAction.bind(null, c.id);
                  return (
                    <div key={c.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {c.slug}
                          </Badge>
                          <Badge variant={c.active ? "default" : "secondary"}>
                            {c.active ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge variant="secondary">{c._count.products} produtos</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            render={<Link href={`/admin/categories/${c.id}`} />}
                          >
                            Editar
                          </Button>
                          <form action={toggle}>
                            <Button type="submit" size="xs" variant="outline">
                              {c.active ? "Desativar" : "Reativar"}
                            </Button>
                          </form>
                        </div>
                      </div>
                      {c.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                      )}
                      {c.children.length > 0 && (
                        <ul className="mt-3 space-y-2 border-l pl-4">
                          {c.children.map((child) => {
                            const toggleChild = toggleCategoryActiveAction.bind(null, child.id);
                            return (
                              <li
                                key={child.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{child.name}</span>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {child.slug}
                                  </Badge>
                                  {!child.active && <Badge variant="secondary">Inativa</Badge>}
                                  <span className="text-muted-foreground">
                                    {child._count.products} produtos
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    render={<Link href={`/admin/categories/${child.id}`} />}
                                  >
                                    Editar
                                  </Button>
                                  <form action={toggleChild}>
                                    <Button type="submit" size="xs" variant="ghost">
                                      {child.active ? "Desativar" : "Reativar"}
                                    </Button>
                                  </form>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
