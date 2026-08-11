import { prisma } from "@/lib/database";
import { getProjectBySlug } from "@/lib/projects";
import { getSiteUrl } from "@/lib/site-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveCapturedProductAction } from "./actions";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function CapturarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{
    name?: string;
    url?: string;
    imageUrl?: string;
    price?: string;
    originalPrice?: string;
    description?: string;
  }>;
}) {
  const { project: slug } = await params;
  const query = await searchParams;
  const project = await getProjectBySlug(slug);
  const categories = await prisma.category.findMany({
    where: { projectId: project.id, active: true },
    orderBy: { name: "asc" },
  });

  const save = saveCapturedProductAction.bind(null, slug);
  const site = getSiteUrl();
  const captureBase = `${site}/admin/afiliados/${slug}/capturar`;

  const bookmarklet = `javascript:(function(){try{var m=function(p){var e=document.querySelector('meta[property=\"'+p+'\"]');return e&&e.content};var t=m('og:title')||document.title||'';var u=m('og:url')||location.href;var i=m('og:image')||'';var d=m('og:description')||'';var body=(document.body&&document.body.innerText)||'';var prices=[].concat(body.match(/R\\$\\s*[\\d.]+,?\\d*/g)||[]).map(function(x){return x.replace(/[^\\d,]/g,'').replace(/\\./g,'').replace(',','.')}).map(Number).filter(function(n){return n>0}).sort(function(a,b){return a-b});var price=prices[0]||'';var original=prices.length>1?prices[prices.length-1]:'';var q=new URLSearchParams({name:t.slice(0,200),url:u,imageUrl:i,description:d.slice(0,500),price:String(price),originalPrice:String(original)});window.open(${JSON.stringify(captureBase)}+'?'+q.toString(),'_blank')}catch(e){alert('Falha ao capturar: '+e)}})();`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookmarklet (Chrome real)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A TikTok bloqueia scrape automático. Use isto: abra o produto no Chrome normal, clique no favorito e
            confirme o formulário.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Arraste o link abaixo para a barra de favoritos</li>
            <li>Abra a página do produto na TikTok (já logado, se precisar)</li>
            <li>Clique no favorito → revisa/salva aqui</li>
          </ol>
          <p>
            <a href={bookmarklet} className="font-medium text-foreground underline">
              Capturar → {project.name}
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salvar produto capturado</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required defaultValue={query.name ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="url">URL *</Label>
              <Input id="url" name="url" type="url" required defaultValue={query.url ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço *</Label>
              <Input id="price" name="price" required defaultValue={query.price ?? ""} placeholder="19.90" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice">Preço original</Label>
              <Input id="originalPrice" name="originalPrice" defaultValue={query.originalPrice ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imageUrl">Imagem</Label>
              <Input id="imageUrl" name="imageUrl" defaultValue={query.imageUrl ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <select id="categoryId" name="categoryId" className={selectClassName} defaultValue="">
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="affiliateUrl">Link de afiliado (opcional)</Label>
              <Input id="affiliateUrl" name="affiliateUrl" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                name="description"
                className={textareaClassName}
                defaultValue={query.description ?? ""}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="activate" value="true" defaultChecked className="size-4" />
                Ativar ao salvar
              </label>
              <Button type="submit" size="sm">
                Salvar produto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
