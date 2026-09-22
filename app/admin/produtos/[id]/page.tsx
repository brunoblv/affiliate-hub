import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminShell, StatusPill } from "@/components/admin-shell";
import {
  EmptyRow,
  ErrorBanner,
  Field,
  Panel,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import {
  addImage,
  addVariant,
  moveImage,
  recheckImage,
  setImageVariant,
  deleteImage,
  deleteOffer,
  deleteProduct,
  deleteVariant,
  saveOffer,
  importOfferFromUrl,
  setCoverImage,
  setProductStatus,
  updateProduct,
} from "@/lib/admin/actions";
import { elapsed, money, reaisInput } from "@/lib/format";
import { syncOffer } from "@/lib/admin/sync-actions";
import { ContentTab } from "@/components/admin-content-tab";
import { CreativesTab } from "@/components/admin-creatives-tab";
import { isGeminiConfigured } from "@/lib/gemini";
import { asText, type RawParams } from "@/lib/query";
import type { Prisma } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "Editar produto · Admin",
  robots: { index: false, follow: false },
};

const TABS = [
  { key: "dados", label: "Dados" },
  { key: "variacoes", label: "Variações" },
  { key: "ofertas", label: "Ofertas" },
  { key: "imagens", label: "Imagens" },
  { key: "conteudo", label: "Conteúdo" },
  { key: "criativos", label: "Criativos" },
] as const;

const STATUS_LABEL = { DRAFT: "Rascunho", PUBLISHED: "Publicado", ARCHIVED: "Arquivado" } as const;
const STATUS_TONE = { DRAFT: "warn", PUBLISHED: "good", ARCHIVED: "neutral" } as const;

export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab = TABS.some((t) => t.key === asText(query.aba)) ? asText(query.aba) : "dados";

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      niches: true,
      content: true,
      creatives: { orderBy: { createdAt: "desc" } },
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: [{ isDefault: "desc" }, { label: "asc" }],
        include: {
          offers: {
            orderBy: { createdAt: "asc" },
            include: { store: true, links: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
  });
  if (!product) notFound();

  const [niches, stores] = await Promise.all([
    prisma.niche.findMany({
      orderBy: { name: "asc" },
      include: { categories: { orderBy: { name: "asc" } } },
    }),
    prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const offerCount = product.variants.reduce((sum, v) => sum + v.offers.length, 0);
  const selectedNiches = new Set(product.niches.map((n) => n.nicheId));

  return (
    <AdminShell active="Produtos">
      <p className="text-xs text-muted">
        <Link href="/admin/produtos" className="hover:text-brand">
          Produtos
        </Link>{" "}
        › {product.name}
      </p>

      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em]">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3.5 text-xs text-muted">
            <StatusPill label={STATUS_LABEL[product.status]} tone={STATUS_TONE[product.status]} />
            <span>slug: {product.slug}</span>
            <span>{product.variants.length} variações</span>
            <span>{offerCount} ofertas</span>
          </div>
        </div>
        <form action={setProductStatus} className="flex gap-2.5">
          <input type="hidden" name="id" value={product.id} />
          {product.status !== "PUBLISHED" ? (
            <button type="submit" name="status" value="PUBLISHED" className={primaryButton}>
              Publicar
            </button>
          ) : (
            <button type="submit" name="status" value="DRAFT" className={secondaryButton}>
              Voltar a rascunho
            </button>
          )}
          {product.status !== "ARCHIVED" ? (
            <button type="submit" name="status" value="ARCHIVED" className={secondaryButton}>
              Arquivar
            </button>
          ) : null}
        </form>
      </div>

      <nav aria-label="Abas do produto" className="mb-5 mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/produtos/${product.id}?aba=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[13px] font-semibold ${
              t.key === tab ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <ErrorBanner message={asText(query.erro)} />
      {asText(query.aviso) ? (
        <p role="status" className="mb-5 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
          {asText(query.aviso)}
        </p>
      ) : null}

      {tab === "dados" ? (
        <div className="flex max-w-[820px] flex-col gap-5">
          <Panel title="Dados gerais">
            <form action={updateProduct} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={product.id} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Nome">
                  <input name="name" defaultValue={product.name} className={inputClass} required />
                </Field>
                <Field label="Slug">
                  <input name="slug" defaultValue={product.slug} className={inputClass} required />
                </Field>
                <Field label="Marca">
                  <input name="brand" defaultValue={product.brand ?? ""} className={inputClass} />
                </Field>
                <Field label="Modelo">
                  <input name="model" defaultValue={product.model ?? ""} className={inputClass} />
                </Field>
                <Field label="GTIN/EAN">
                  <input name="gtin" defaultValue={product.gtin ?? ""} className={inputClass} />
                </Field>
                <Field label="Categoria">
                  <select name="categoryId" defaultValue={product.categoryId ?? ""} className={inputClass}>
                    <option value="">Sem categoria</option>
                    {niches.map((niche) => (
                      <optgroup key={niche.id} label={niche.name}>
                        {niche.categories.length === 0 ? (
                          <option disabled>(sem categorias — crie em Nichos e categorias)</option>
                        ) : null}
                        {niche.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Resumo">
                <textarea
                  name="summary"
                  defaultValue={product.summary ?? ""}
                  rows={3}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-semibold text-muted">Nichos</legend>
                {niches.length === 0 ? (
                  <p className="text-xs text-muted">Nenhum nicho cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {niches.map((niche) => (
                      <label key={niche.id} className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          name="nicheIds"
                          value={niche.id}
                          defaultChecked={selectedNiches.has(niche.id)}
                        />
                        {niche.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <div>
                <button type="submit" className={primaryButton}>
                  Salvar alterações
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Zona de risco">
            <form action={deleteProduct} className="flex items-center justify-between gap-4">
              <input type="hidden" name="id" value={product.id} />
              <p className="text-xs text-muted">
                Exclui o produto, variações, ofertas, links e histórico. Para tirar do site sem perder dados, use
                “Arquivar”.
              </p>
              <button type="submit" className={dangerButton}>
                Excluir produto
              </button>
            </form>
          </Panel>
        </div>
      ) : null}

      {tab === "variacoes" ? (
        <div className="flex max-w-[720px] flex-col gap-5">
          <Panel title="Variações">
            <p className="mb-3 text-xs text-muted">
              Cada combinação comparável (30 ml, 60 ml, kit com 3, usado) é uma variação. Ofertas só concorrem
              entre si dentro da mesma variação.
            </p>
            <div className="overflow-hidden rounded-[10px] border border-line">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between gap-3 border-b border-line-soft px-3.5 py-2.5 text-[13px] last:border-b-0"
                >
                  <span>
                    <strong>{variant.label}</strong>
                    <span className="ml-2 text-xs text-muted">
                      {variant.offers.length} ofertas{variant.isDefault ? " · padrão" : ""}
                    </span>
                  </span>
                  {variant.isDefault ? null : (
                    <form action={deleteVariant}>
                      <input type="hidden" name="id" value={variant.id} />
                      <button type="submit" className={dangerButton}>
                        Remover
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Nova variação">
            <form action={addVariant} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Rótulo" className="min-w-[220px] flex-1">
                <input name="label" className={inputClass} placeholder="Ex.: 60 ml" required />
              </Field>
              <button type="submit" className={primaryButton}>
                Adicionar
              </button>
            </form>
          </Panel>
        </div>
      ) : null}

      {tab === "ofertas" ? (
        <div className="flex max-w-[980px] flex-col gap-5">
          {stores.length === 0 ? (
            <p className="rounded-lg bg-warn-bg px-3 py-2.5 text-xs text-warn-ink">
              Cadastre ao menos uma loja em{" "}
              <Link href="/admin/lojas" className="font-semibold underline">
                Lojas
              </Link>{" "}
              antes de adicionar ofertas.
            </p>
          ) : null}

          {product.variants.map((variant) => (
            <Panel key={variant.id} title={`${variant.label} · ${variant.offers.length} ofertas`}>
              {variant.offers.length === 0 ? (
                <div className="rounded-[10px] border border-line">
                  <EmptyRow>Nenhuma oferta nesta variação.</EmptyRow>
                </div>
              ) : null}
              <div className="flex flex-col gap-2.5">
                {variant.offers.map((offer) => (
                  <details key={offer.id} className="rounded-[10px] border border-line">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5 text-[13px]">
                      <span className="font-semibold">{offer.store.name}</span>
                      <span className="text-muted">{offer.sellerName}</span>
                      <span className="font-bold">
                        {offer.priceCents === null ? "sem preço" : money(offer.priceCents)}
                      </span>
                      {offer.links.length === 0 ? (
                        <StatusPill label="sem link de afiliado" tone="warn" />
                      ) : null}
                      {offer.active ? null : <StatusPill label="inativa" tone="neutral" />}
                    </summary>
                    <div className="flex flex-col gap-3.5 border-t border-line p-3.5">
                      {offer.store.connector ? (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-canvas px-3.5 py-2.5 text-xs">
                          <span className="text-muted">
                            Última coleta:{" "}
                            <strong className="text-ink">
                              {offer.priceCheckedAt
                                ? `há ${elapsed(Math.max(0, Math.round((Date.now() - offer.priceCheckedAt.getTime()) / 60000)))}`
                                : "ainda não coletada"}
                            </strong>
                          </span>
                          {offer.lastError ? <span className="text-bad-ink">{offer.lastError}</span> : null}
                          {offer.needsReview ? (
                            <Link href="/admin/precos" className="font-semibold text-warn-ink underline">
                              Preço em revisão
                            </Link>
                          ) : null}
                          <form action={syncOffer} className="ml-auto">
                            <input type="hidden" name="offerId" value={offer.id} />
                            <input type="hidden" name="voltar" value={`/admin/produtos/${product.id}?aba=ofertas`} />
                            <button type="submit" className={secondaryButton}>
                              Atualizar agora
                            </button>
                          </form>
                        </div>
                      ) : null}
                      <OfferForm
                        productId={product.id}
                        variants={product.variants}
                        stores={stores}
                        offer={offer}
                      />
                    </div>
                  </details>
                ))}
              </div>
            </Panel>
          ))}

          <Panel title="Importar por link (Shopee / Mercado Livre)">
            <form action={importOfferFromUrl} className="flex flex-col gap-3.5">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid gap-3.5 sm:grid-cols-[1fr_2fr_2fr]">
                <Field label="Variação">
                  <select name="variantId" defaultValue={product.variants[0]?.id} className={inputClass} required>
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="URL completa do produto">
                  <input name="url" type="url" className={`${inputClass} font-mono text-xs`} placeholder="https://shopee.com.br/... ou https://www.mercadolivre.com.br/.../p/MLB..." required />
                </Field>
                <Field label="Link de afiliado (só Mercado Livre)">
                  <input name="affiliateUrl" type="url" className={`${inputClass} font-mono text-xs`} placeholder="https://meli.la/..." />
                </Field>
              </div>
              <p className="text-[11px] text-muted">
                Vendedor, preço, preço anterior, IDs e foto (se o produto ainda não tiver) vêm da API. Shopee também traz o link
                de afiliado; no Mercado Livre, use a página de catálogo (/p/MLB…) e cole o link meli.la, que não tem API — sem ele
                a oferta fica sem link e não aparece no site. Condição de pagamento e parcelas você ajusta depois.
              </p>
              <div>
                <button type="submit" className={primaryButton}>
                  Importar oferta
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Nova oferta (manual)">
            <OfferForm productId={product.id} variants={product.variants} stores={stores} />
          </Panel>
        </div>
      ) : null}

      {tab === "conteudo" ? (
        <ContentTab
          productId={product.id}
          specs={product.specs}
          content={product.content}
          geminiConfigured={isGeminiConfigured()}
        />
      ) : null}

      {tab === "criativos" ? (
        <CreativesTab
          productId={product.id}
          creatives={product.creatives}
          hasPhoto={product.images.some((image) => !image.broken)}
        />
      ) : null}

      {tab === "imagens" ? (
        <div className="flex max-w-[980px] flex-col gap-5">
          <Panel title="Imagens">
            {product.images.length === 0 ? (
              <EmptyRow>Nenhuma imagem. Cole abaixo a URL de uma foto do produto.</EmptyRow>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
              {product.images.map((image, index) => (
                <figure key={image.id} className="flex flex-col gap-2.5 rounded-[10px] border border-line p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt ?? product.name}
                    referrerPolicy="no-referrer"
                    className={`aspect-square w-full rounded-lg bg-canvas object-contain ${image.broken ? "opacity-40" : ""}`}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {image.isCover ? <StatusPill label="capa" tone="good" /> : null}
                    {image.broken ? <StatusPill label="quebrada · fora do site" tone="bad" /> : null}
                    <span className="text-[11px] text-muted">
                      {image.source ?? "origem n/d"}
                      {image.verifiedAt ? ` · conferida há ${elapsed(Math.max(0, Math.round((Date.now() - image.verifiedAt.getTime()) / 60000)))}` : " · não conferida"}
                    </span>
                  </div>

                  <form action={setImageVariant} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={image.id} />
                    <label className="sr-only" htmlFor={`var-${image.id}`}>
                      Variação da foto
                    </label>
                    <select id={`var-${image.id}`} name="variantId" defaultValue={image.variantId ?? ""} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs outline-none focus:border-brand">
                      <option value="">Produto todo</option>
                      {product.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          Só: {variant.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={secondaryButton}>
                      Salvar
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={moveImage}>
                      <input type="hidden" name="id" value={image.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={index === 0} aria-label="Subir" className={`${secondaryButton} disabled:opacity-40`}>
                        ↑
                      </button>
                    </form>
                    <form action={moveImage}>
                      <input type="hidden" name="id" value={image.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={index === product.images.length - 1} aria-label="Descer" className={`${secondaryButton} disabled:opacity-40`}>
                        ↓
                      </button>
                    </form>
                    {image.isCover ? null : (
                      <form action={setCoverImage}>
                        <input type="hidden" name="id" value={image.id} />
                        <button type="submit" className={secondaryButton}>
                          Definir capa
                        </button>
                      </form>
                    )}
                    <form action={recheckImage}>
                      <input type="hidden" name="id" value={image.id} />
                      <button type="submit" className={secondaryButton}>
                        Conferir
                      </button>
                    </form>
                    <form action={deleteImage}>
                      <input type="hidden" name="id" value={image.id} />
                      <button type="submit" className={dangerButton}>
                        Remover
                      </button>
                    </form>
                  </div>
                </figure>
              ))}
            </div>
          </Panel>
          <Panel title="Adicionar imagem">
            <form action={addImage} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="URL da imagem" className="sm:col-span-2">
                <input name="url" type="url" className={inputClass} required />
              </Field>
              <Field label="Texto alternativo">
                <input name="alt" className={inputClass} />
              </Field>
              <Field label="Vale para">
                <select name="variantId" defaultValue="" className={inputClass}>
                  <option value="">Produto todo</option>
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      Só a variação: {variant.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className={primaryButton}>
                  Adicionar
                </button>
                <span className="ml-3 text-[11px] text-muted">A URL é conferida (precisa devolver uma imagem) antes de salvar.</span>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}
    </AdminShell>
  );
}

type OfferWithRelations = Prisma.OfferGetPayload<{ include: { store: true; links: true } }>;

function OfferForm({
  productId,
  variants,
  stores,
  offer,
}: {
  productId: string;
  variants: { id: string; label: string }[];
  stores: { id: string; name: string }[];
  offer?: OfferWithRelations;
}) {
  const link = offer?.links[0];
  return (
    <form action={saveOffer} className="flex flex-col gap-3.5">
      <input type="hidden" name="productId" value={productId} />
      {offer ? <input type="hidden" name="id" value={offer.id} /> : null}

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Field label="Variação">
          <select name="variantId" defaultValue={offer?.variantId ?? variants[0]?.id} className={inputClass} required>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Loja">
          <select name="storeId" defaultValue={offer?.storeId ?? ""} className={inputClass} required>
            <option value="" disabled>
              Escolha
            </option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
            {offer && !stores.some((s) => s.id === offer.storeId) ? (
              <option value={offer.storeId}>{offer.store.name} (inativa)</option>
            ) : null}
          </select>
        </Field>
        <Field label="Vendedor">
          <input name="sellerName" defaultValue={offer?.sellerName ?? ""} className={inputClass} required />
        </Field>
        <Field label="Preço à vista (R$)">
          <input name="price" inputMode="decimal" defaultValue={reaisInput(offer?.priceCents)} className={inputClass} placeholder="1.299,90" />
        </Field>
        <Field label="Preço anterior (R$)">
          <input name="previousPrice" inputMode="decimal" defaultValue={reaisInput(offer?.previousPriceCents)} className={inputClass} />
        </Field>
        <Field label="Condição do preço à vista">
          <input name="priceCondition" defaultValue={offer?.priceCondition ?? ""} className={inputClass} maxLength={60} placeholder="Pix, NuPay, cupom..." />
        </Field>
        <Field label="Parcelas">
          <input name="installments" type="number" min={1} defaultValue={offer?.installments ?? ""} className={inputClass} />
        </Field>
        <Field label="Total parcelado (R$)">
          <input name="installmentPrice" inputMode="decimal" defaultValue={reaisInput(offer?.installmentPriceCents)} className={inputClass} placeholder="Vazio = igual ao à vista" />
        </Field>
        <Field label="Frete">
          <select name="shippingKind" defaultValue={offer?.shippingKind ?? "UNKNOWN"} className={inputClass}>
            <option value="UNKNOWN">Desconhecido</option>
            <option value="FREE">Grátis</option>
            <option value="PAID">Pago</option>
            <option value="CONDITIONAL">Condicional</option>
          </select>
        </Field>
        <Field label="Valor do frete (R$)">
          <input name="shipping" inputMode="decimal" defaultValue={reaisInput(offer?.shippingCents)} className={inputClass} />
        </Field>
        <Field label="Condição">
          <select name="condition" defaultValue={offer?.condition ?? "NEW"} className={inputClass}>
            <option value="NEW">Novo</option>
            <option value="USED">Usado</option>
          </select>
        </Field>
        <Field label="Disponibilidade">
          <select name="availability" defaultValue={offer?.availability ?? "UNKNOWN"} className={inputClass}>
            <option value="UNKNOWN">Desconhecida</option>
            <option value="IN_STOCK">Em estoque</option>
            <option value="OUT_OF_STOCK">Sem estoque</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={offer?.status ?? "ACTIVE"} className={inputClass}>
            <option value="ACTIVE">Ativa</option>
            <option value="STALE">Desatualizada</option>
            <option value="ERROR">Com erro</option>
          </select>
        </Field>
        <Field label="ID do anúncio na loja">
          <input name="externalListingId" defaultValue={offer?.externalListingId ?? ""} className={inputClass} />
        </Field>
        <Field label="ID da loja no marketplace">
          <input name="externalSellerId" defaultValue={offer?.externalSellerId ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="URL original (só referência interna)">
          <input name="originalUrl" type="url" defaultValue={offer?.originalUrl ?? ""} className={`${inputClass} font-mono text-xs`} />
        </Field>
        <Field label="URL de afiliado (usada nos botões)">
          <input name="affiliateUrl" type="url" defaultValue={link?.url ?? ""} className={`${inputClass} font-mono text-xs`} />
        </Field>
      </div>
      <p className="text-[11px] text-muted">
        Em lojas com conector (Shopee), cole a URL completa do produto: os IDs são lidos dela e o preço e o link de
        afiliado vêm da primeira coleta. Links curtos não servem.
      </p>
      {link ? <p className="text-[11px] text-muted">Código público: /go/{link.shortCode}</p> : null}
      {offer ? (
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="active" defaultChecked={offer.active} />
          Oferta ativa
        </label>
      ) : null}

      <div className="flex gap-2">
        <button type="submit" className={primaryButton}>
          {offer ? "Salvar oferta" : "Adicionar oferta"}
        </button>
        {offer ? (
          <button type="submit" formAction={deleteOffer} formNoValidate className={dangerButton}>
            Excluir
          </button>
        ) : null}
      </div>
    </form>
  );
}
