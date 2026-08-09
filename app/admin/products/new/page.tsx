import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createProductAction } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const [projects, categories] = await Promise.all([
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, include: { project: true } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Novo produto"
        description="Cadastro manual (modo Manual do Autopilot) — o score e possíveis oportunidades são calculados automaticamente ao salvar."
      />

      <Card>
        <CardContent className="pt-6">
          <form action={createProductAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projeto *</Label>
                <select
                  id="projectId"
                  name="projectId"
                  required
                  defaultValue={projectId ?? projects[0]?.id}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">—</option>
                {projects.map((project) => (
                  <optgroup key={project.id} label={project.name}>
                    {categories
                      .filter((c) => c.projectId === project.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Preço original</Label>
                <Input id="originalPrice" name="originalPrice" type="number" step="0.01" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPercent">Comissão (%)</Label>
                <Input id="commissionPercent" name="commissionPercent" type="number" step="0.01" min="0" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Avaliação (0-5)</Label>
                <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewCount">Nº de avaliações</Label>
                <Input id="reviewCount" name="reviewCount" type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soldCount">Vendidos</Label>
                <Input id="soldCount" name="soldCount" type="number" min="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da imagem</Label>
                <Input id="imageUrl" name="imageUrl" type="url" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productUrl">URL do produto</Label>
                <Input id="productUrl" name="productUrl" type="url" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit">Salvar e calcular score</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
