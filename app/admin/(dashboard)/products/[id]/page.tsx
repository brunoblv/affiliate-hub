import { notFound } from "next/navigation";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  updateProductAction,
  toggleProductStatusAction,
  createAffiliateLinkAction,
  registerConversionAction,
} from "../actions";
import { generateContentAction } from "@/app/admin/(dashboard)/content/actions";
import { Channel } from "@/lib/generated/prisma/client";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
      opportunities: { where: { status: "OPEN" }, orderBy: { score: "desc" } },
      priceHistory: { orderBy: { recordedAt: "desc" }, take: 10 },
      affiliateLinks: { orderBy: { createdAt: "desc" } },
      contents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const score = product.scores[0];
  const isBlocked = product.status === "BLOCKED";

  const updateWithId = updateProductAction.bind(null, product.id);
  const toggleStatusWithId = toggleProductStatusAction.bind(null, product.id);
  const createLinkWithId = createAffiliateLinkAction.bind(null, product.id);
  const generateContentWithId = generateContentAction.bind(null, product.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={product.name} description={`Cadastrado em ${product.createdAt.toLocaleDateString("pt-BR")}`} />
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={isBlocked ? "destructive" : "default"}>{product.status}</Badge>
          <form action={toggleStatusWithId}>
            <Button type="submit" variant="outline" size="sm">
              {isBlocked ? "Reativar" : "Bloquear"}
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {score ? Number(score.totalScore).toFixed(0) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oportunidades abertas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{product.opportunities.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Histórico de preço</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{product.priceHistory.length} registro(s)</CardContent>
        </Card>
      </div>

      {product.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades abertas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {product.opportunities.map((o) => (
              <Badge key={o.id} variant="secondary">
                {o.type.replaceAll("_", " ")}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.contents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.contents.map((c) => (
                <Link key={c.id} href={`/admin/content/${c.id}`}>
                  <Badge variant="secondary" className="cursor-pointer">
                    {c.type.replaceAll("_", " ")} · {c.status.replaceAll("_", " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          <form action={generateContentWithId} className="flex gap-2">
            <select
              name="channel"
              defaultValue={Channel.FACEBOOK}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Object.values(Channel).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Gerar conteúdo
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links de afiliado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.affiliateLinks.length > 0 && (
            <div className="space-y-3">
              {product.affiliateLinks.map((link) => {
                const registerConversionWithId = registerConversionAction.bind(null, link.id);
                return (
                  <div key={link.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{link.channel}</Badge>
                        {link.subId && <span className="text-xs text-muted-foreground">sub_id: {link.subId}</span>}
                      </div>
                      <code className="rounded bg-muted px-2 py-1 text-xs">/go/{link.shortCode}</code>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{link.affiliateUrl}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Cliques: {link.clicks}</span>
                        <span>Conversões: {link.conversions}</span>
                        <span>Comissão: {formatCurrency(Number(link.commission))}</span>
                      </div>
                      <form action={registerConversionWithId} className="flex items-center gap-2">
                        <Input
                          name="commission"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Comissão R$"
                          required
                          className="h-7 w-28 text-xs"
                        />
                        <Button type="submit" size="xs" variant="outline">
                          Registrar venda
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form action={createLinkWithId} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[140px_1fr_120px_auto]">
            <select
              name="channel"
              defaultValue={Channel.FACEBOOK}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Object.values(Channel).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input name="affiliateUrl" type="url" placeholder="URL de afiliado (gerada na Shopee/TikTok)" required />
            <Input name="subId" placeholder="sub_id (opcional)" />
            <Button type="submit" variant="secondary">
              Criar link
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={product.name} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" defaultValue={product.brand ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={product.categoryId ?? ""}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={product.description ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={Number(product.price)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Preço original</Label>
                <Input
                  id="originalPrice"
                  name="originalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product.originalPrice ? Number(product.originalPrice) : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPercent">Comissão (%)</Label>
                <Input
                  id="commissionPercent"
                  name="commissionPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product.commissionPercent ? Number(product.commissionPercent) : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Avaliação (0-5)</Label>
                <Input
                  id="rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  defaultValue={product.rating ? Number(product.rating) : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewCount">Nº de avaliações</Label>
                <Input id="reviewCount" name="reviewCount" type="number" min="0" defaultValue={product.reviewCount ?? undefined} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soldCount">Vendidos</Label>
                <Input id="soldCount" name="soldCount" type="number" min="0" defaultValue={product.soldCount ?? undefined} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da imagem</Label>
                <Input id="imageUrl" name="imageUrl" type="url" defaultValue={product.imageUrl ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productUrl">URL do produto</Label>
                <Input id="productUrl" name="productUrl" type="url" defaultValue={product.productUrl ?? ""} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit">Salvar e recalcular score</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {product.priceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de preço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {product.priceHistory.map((h) => (
              <div key={h.id} className="flex justify-between">
                <span>{h.recordedAt.toLocaleString("pt-BR")}</span>
                <span>{formatCurrency(Number(h.price))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
