import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTikTokPostAction } from "../actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function NovoTikTokPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ productId?: string }>;
}) {
  const { project: slug } = await params;
  const query = await searchParams;
  const project = await getProjectBySlug(slug);

  const products = await prisma.product.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, name: true, price: true, productUrl: true },
  });

  const save = createTikTokPostAction.bind(null, slug);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastrar post do TikTok</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            O TikTok Shop não tem versão web pra automatizar a busca/postagem de produtos. Preencha as informações
            aqui e o post entra na fila (aba &quot;TikTok (fila)&quot;) pra você postar manualmente no app e marcar
            como feito.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do post</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="productId">Produto (opcional)</Label>
              <select
                id="productId"
                name="productId"
                className={selectClassName}
                defaultValue={query.productId ?? ""}
              >
                <option value="">Sem produto vinculado</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatCurrency(Number(p.price))}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Título (uso interno, opcional)</Label>
              <Input id="title" name="title" placeholder="Ex.: Air fryer promoção" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="caption">Legenda *</Label>
              <textarea id="caption" name="caption" required className={textareaClassName} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hashtags">Hashtags</Label>
              <Input id="hashtags" name="hashtags" placeholder="#achadinhos #promocao" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="affiliateUrl">Link de afiliado (pra colocar na bio/comentário)</Label>
              <Input id="affiliateUrl" name="affiliateUrl" type="url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Imagem de capa</Label>
              <Input id="imageUrl" name="imageUrl" placeholder="Deixe em branco pra usar a do produto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Link do vídeo (Drive, etc.)</Label>
              <Input id="videoUrl" name="videoUrl" type="url" />
            </div>
            <div className="flex sm:col-span-2">
              <Button type="submit" size="sm">
                Adicionar à fila
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
