import { FolderTree } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { children: true, _count: { select: { products: true } } },
    where: { parentId: null },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" description="Taxonomia hierárquica de produtos (Casa, Dia a Dia, ...)" />

      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="Nenhuma categoria cadastrada" description="Rode o seed inicial para criar as categorias base." />
      ) : (
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <Badge variant="secondary">{c._count.products} produtos</Badge>
              </div>
              {c.children.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.children.map((child) => (
                    <Badge key={child.id} variant="outline">
                      {child.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
