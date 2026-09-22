import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OfferList } from "@/components/offer-list";
import { PriceHistory } from "@/components/price-history";
import { ProductTile } from "@/components/product-card";
import { ProductImage } from "@/components/photo";
import { DropBadge } from "@/components/price";
import { NoOffers, StaleNotice, UnpublishedContent } from "@/components/states";
import { BellIcon, HeartIcon } from "@/components/icons";
import { getOfferHistory, getProductBySlug, listRelated } from "@/lib/catalog";
import { groupByStore, isEligible, summarize } from "@/lib/pricing";
import { elapsed, installmentLabel, integer, money } from "@/lib/format";
import { asText, type RawParams } from "@/lib/query";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteAlert, saveAlert, toggleFavorite } from "@/lib/user/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProductBySlug(slug);
  if (!found) return { title: "Produto não encontrado", robots: { index: false } };
  const { product, content } = found;
  return {
    title: content?.metaTitle || product.name,
    description: content?.metaDescription || product.summary || undefined,
    alternates: { canonical: `/produto/${product.slug}` },
    // Sem oferta atual não há página útil para indexar (seção 12).
    robots: product.prices.offerCount === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const found = await getProductBySlug(slug);
  if (!found) notFound();

  const { product, niche, categoryName, content } = found;

  // Comparação sempre dentro de UMA variação (30 ml não concorre com 60 ml).
  const requested = product.variants.find((variant) => variant.id === asText(query.variacao));
  const withOffers = product.variants.find((variant) =>
    found.offers.some((offer) => offer.variantId === variant.id && isEligible(offer)),
  );
  const selected = requested ?? withOffers ?? product.variants[0];
  const variantOffers = found.offers.filter((offer) => offer.variantId === selected?.id);

  // Galeria da variação escolhida: as fotos dela primeiro e as gerais depois; fotos de OUTRA variação ficam de fora.
  const gallery = [
    ...product.images.filter((image) => image.variantId === selected?.id),
    ...product.images.filter((image) => image.variantId === null),
  ];
  const galleryProduct = { name: product.name, images: gallery };

  const storeOf = (id: string) => found.stores.find((store) => store.id === id)!;
  const eligible = variantOffers.filter(isEligible);
  const best = eligible[0] ?? null;
  const groups = groupByStore(variantOffers, storeOf);
  const {
    lowestCents,
    highestCents,
    previousCents,
    offerCount,
    storeCount,
    freshestMinutesAgo,
    installmentTimes,
    installmentTotalCents,
    priceCondition,
  } = summarize(variantOffers);
  const installmentText = installmentLabel(installmentTotalCents, installmentTimes);
  const spread = lowestCents !== null && highestCents !== null ? highestCents - lowestCents : null;

  const [related, history] = await Promise.all([
    listRelated(product),
    best ? getOfferHistory(best.id) : Promise.resolve([]),
  ]);
  const nowMs = Date.now();

  // Estado do usuário logado: favorito e alerta deste produto.
  const userId = (await auth())?.user?.id;
  const [favorite, alert] = userId
    ? await Promise.all([
        prisma.favorite.findUnique({ where: { userId_productId: { userId, productId: product.id } } }),
        prisma.priceAlert.findUnique({ where: { userId_productId: { userId, productId: product.id } } }),
      ])
    : [null, null];
  const back = `/produto/${product.slug}`;
  const loginHref = `/entrar?callbackUrl=${encodeURIComponent(back)}`;
  const errorMessage = asText(query.erro);
  const okMessage = asText(query.ok);

  return (
    <>
      <SiteHeader />

      <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pb-32 pt-5 sm:px-8 lg:pb-24">
        <nav aria-label="Trilha" className="py-2 pb-5 text-[13px] text-muted">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          {niche ? (
            <>
              <span className="px-1.5 text-ghost">›</span>
              <Link href={`/categoria/${niche.slug}`} className="hover:text-brand">
                {niche.name}
              </Link>
            </>
          ) : null}
          {categoryName ? (
            <>
              <span className="px-1.5 text-ghost">›</span>
              <span>{categoryName}</span>
            </>
          ) : null}
          <span className="px-1.5 text-ghost">›</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col-reverse gap-4 sm:flex-row">
            {gallery.length > 1 ? (
              <ul className="flex flex-none gap-2.5 sm:flex-col" aria-label="Miniaturas">
                {gallery.map((image, index) => (
                  <li key={image.url}>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir imagem ${index + 1} de ${gallery.length}`}
                      className={`block h-16 w-16 overflow-hidden rounded-[9px] border bg-canvas ${
                        index === 0 ? "border-[1.5px] border-brand" : "border-line"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" loading="lazy" className="h-full w-full object-contain" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex aspect-square flex-1 items-center justify-center rounded-[14px] border border-line bg-surface">
              <ProductImage product={galleryProduct} className="h-[78%] w-[78%]" rounded="rounded-xl" />
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {product.brand ? (
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                {product.brand}
              </span>
            ) : null}
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[32px]">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted">
              {product.rating !== null ? (
                <span className="font-semibold text-ink">
                  ★ {product.rating.toFixed(1).replace(".", ",")}
                </span>
              ) : null}
              {product.reviewCount !== null ? (
                <span>{integer(product.reviewCount)} avaliações</span>
              ) : null}
              {product.gtin ? (
                <>
                  <span className="text-ghost">·</span>
                  <span>GTIN {product.gtin}</span>
                </>
              ) : null}
            </div>

            {product.variants.length > 1 ? (
              <nav aria-label="Variação" className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted">Variação</span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const current = variant.id === selected?.id;
                    return (
                      <Link
                        key={variant.id}
                        href={`/produto/${product.slug}?variacao=${variant.id}`}
                        aria-current={current ? "true" : undefined}
                        scroll={false}
                        className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium ${
                          current
                            ? "border-brand bg-brand-soft text-brand-dark"
                            : "border-line bg-surface hover:border-brand"
                        }`}
                      >
                        {variant.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            ) : null}

            <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5 shadow-card">
              <span className="text-[13px] font-semibold text-muted">
                Menor preço entre as ofertas monitoradas
              </span>

              {lowestCents === null ? (
                <p className="text-xl font-bold text-muted">Sem ofertas atualizadas no momento.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">
                      {money(lowestCents)}
                    </span>
                    <DropBadge from={previousCents} to={lowestCents} />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    {previousCents && previousCents > lowestCents ? (
                      <span className="text-sm text-muted line-through">{money(previousCents)}</span>
                    ) : null}
                    {priceCondition ? <span className="text-sm text-muted">{priceCondition}</span> : null}
                    {installmentText ? <span className="text-sm text-muted">ou {installmentText}</span> : null}
                  </div>
                  {spread && spread > 0 ? (
                    <p className="rounded-[10px] bg-good-bg px-3.5 py-2.5 text-sm font-semibold text-good">
                      Economize até {money(spread)} comparando as lojas
                    </p>
                  ) : null}
                  {best ? (
                    <a
                      href={`/go/${best.shortCode}`}
                      rel="sponsored nofollow noopener"
                      target="_blank"
                      className="flex h-[50px] items-center justify-center rounded-[10px] bg-brand text-base font-semibold text-surface transition-colors hover:bg-brand-dark"
                    >
                      Ver melhor oferta
                    </a>
                  ) : null}
                </>
              )}

              <div className="flex gap-2.5">
                {userId ? (
                  <form action={toggleFavorite} className="flex flex-1">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="voltar" value={back} />
                    <button
                      type="submit"
                      aria-pressed={!!favorite}
                      className={`flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[9px] border text-[13px] font-medium transition-colors hover:border-brand hover:text-brand ${
                        favorite ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface"
                      }`}
                    >
                      <HeartIcon /> {favorite ? "Favoritado" : "Favoritar"}
                    </button>
                  </form>
                ) : (
                  <Link
                    href={loginHref}
                    className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-line bg-surface text-[13px] font-medium transition-colors hover:border-brand hover:text-brand"
                  >
                    <HeartIcon /> Favoritar
                  </Link>
                )}
                <a
                  href="#alerta"
                  className={`flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[9px] border text-[13px] font-medium transition-colors hover:border-brand hover:text-brand ${
                    alert ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface"
                  }`}
                >
                  <BellIcon /> {alert ? "Alerta ativo" : "Alerta de preço"}
                </a>
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-1 text-xs text-muted">
                <span>
                  <strong className="text-ink">{offerCount} ofertas</strong> em {storeCount} lojas
                </span>
                {freshestMinutesAgo === null ? (
                  <span className="text-warn-ink">Sem ofertas atualizadas</span>
                ) : (
                  <span>Preço atualizado há {elapsed(freshestMinutesAgo)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-14">
            <section aria-labelledby="comparar">
              <div className="mb-1.5 flex items-baseline justify-between gap-4">
                <h2 id="comparar" className="text-[22px] font-bold tracking-[-0.025em]">
                  Compare preços
                </h2>
                <span className="text-xs text-muted">Ordenado por menor preço</span>
              </div>
              <p className="mb-4 text-sm text-muted">
                {offerCount} ofertas encontradas em {storeCount} lojas.
              </p>

              {eligible.length === 0 ? (
                <NoOffers storeCount={storeCount} />
              ) : (
                <OfferList groups={groups} bestOfferId={best?.id ?? null} />
              )}

              {eligible.length > 0 && eligible.length < variantOffers.length ? (
                <div className="mt-3.5">
                  <StaleNotice
                    label={`${variantOffers.length - eligible.length} oferta(s) fora da comparação por estoque, erro de coleta ou preço vencido.`}
                  />
                </div>
              ) : null}

              <p className="mt-3.5 text-xs text-muted">
                Os preços são coletados automaticamente e podem variar. Confirme o valor final na
                loja. Ganhamos comissão sobre compras feitas por estes links; isso não altera a
                ordenação por preço.
              </p>
            </section>

            <PriceHistory points={history} nowMs={nowMs} />

            <section aria-labelledby="sobre">
              <h2 id="sobre" className="mb-4 text-[22px] font-bold tracking-[-0.025em]">
                Sobre este produto
              </h2>

              {content ? (
                <div className="mb-8 flex flex-col gap-6">
                  {content.title ? <p className="text-lg font-semibold leading-snug">{content.title}</p> : null}
                  <div className="flex flex-col gap-3">
                    {content.description
                      .split(/\n\s*\n/)
                      .filter(Boolean)
                      .map((paragraph, index) => (
                        <p key={index} className="text-sm leading-relaxed text-muted">
                          {paragraph}
                        </p>
                      ))}
                  </div>

                  {content.benefits.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-[15px] font-bold">Destaques do produto</h3>
                      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
                        {content.benefits.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {content.audience ? (
                    <div>
                      <h3 className="mb-2 text-[15px] font-bold">Para quem faz sentido</h3>
                      <p className="text-sm leading-relaxed text-muted">{content.audience}</p>
                    </div>
                  ) : null}

                  {content.howToUse ? (
                    <div>
                      <h3 className="mb-2 text-[15px] font-bold">Como usar</h3>
                      <p className="text-sm leading-relaxed text-muted">{content.howToUse}</p>
                    </div>
                  ) : null}

                  {content.limitations.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-[15px] font-bold">Cuidados e limitações</h3>
                      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
                        {content.limitations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {content.faq.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-[15px] font-bold">Perguntas frequentes</h3>
                      <div className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
                        {content.faq.map((entry) => (
                          <details key={entry.question} className="border-b border-line-soft px-5 py-3.5 last:border-b-0">
                            <summary className="cursor-pointer text-sm font-semibold">{entry.question}</summary>
                            <p className="mt-2 text-sm leading-relaxed text-muted">{entry.answer}</p>
                          </details>
                        ))}
                      </div>
                      {/* Marcação estruturada só do que está visível na página. "<" escapado: sem injeção de tag. */}
                      <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                          __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            mainEntity: content.faq.map((entry) => ({
                              "@type": "Question",
                              name: entry.question,
                              acceptedAnswer: { "@type": "Answer", text: entry.answer },
                            })),
                          }).replace(/</g, "\\u003c"),
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : product.summary ? (
                <p className="mb-4 text-sm leading-relaxed text-muted">{product.summary}</p>
              ) : null}

              {product.specs.length === 0 ? (
                content ? null : <UnpublishedContent />
              ) : (
                <>
                  {content ? <h3 className="mb-2 text-[15px] font-bold">Especificações</h3> : null}
                  <dl className="overflow-hidden rounded-[14px] border border-line bg-surface">
                    {product.specs.map((spec) => (
                      <div
                        key={spec.key}
                        className="grid gap-5 border-b border-line-soft px-5 py-3.5 sm:grid-cols-[200px_minmax(0,1fr)]"
                      >
                        <dt className="text-[13px] text-muted">{spec.key}</dt>
                        <dd className={`text-sm ${spec.value === null ? "text-muted" : "font-medium"}`}>
                          {spec.value ?? "— não informado pelo fabricante"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </section>

            {related.length > 0 ? (
              <section aria-labelledby="relacionados">
                <h2 id="relacionados" className="mb-4 text-[22px] font-bold tracking-[-0.025em]">
                  Talvez você também esteja procurando
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
                  {related.map((item) => (
                    <ProductTile key={item.slug} product={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            <div id="alerta" className="flex scroll-mt-24 flex-col gap-3.5 rounded-[14px] bg-ink p-6">
              <h2 className="text-[19px] font-bold tracking-[-0.02em] text-surface">Quer pagar menos?</h2>
              <p className="text-sm leading-relaxed text-ghost">
                Guarde o preço que você quer pagar. Ele fica salvo na sua conta e mostra quando o produto chega lá.
              </p>

              {errorMessage ? (
                <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] font-medium text-bad-ink">
                  {errorMessage}
                </p>
              ) : null}
              {okMessage ? (
                <p role="status" className="rounded-lg bg-good-bg px-3 py-2 text-[13px] font-medium text-good">
                  {okMessage}
                </p>
              ) : null}

              {userId ? (
                <>
                  <form action={saveAlert} className="flex flex-col gap-3.5">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="voltar" value={`${back}#alerta`} />
                    <label className="flex flex-col gap-1.5">
                      <span className="sr-only">Preço desejado</span>
                      <input
                        name="target"
                        inputMode="decimal"
                        defaultValue={alert ? (alert.targetCents / 100).toFixed(2).replace(".", ",") : ""}
                        placeholder="Preço desejado, ex.: 199,90"
                        className="h-[46px] rounded-[9px] bg-surface px-3.5 text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-[46px] rounded-[9px] bg-brand text-[15px] font-semibold text-surface transition-colors hover:bg-brand-dark"
                    >
                      {alert ? "Atualizar alerta" : "Criar alerta de preço"}
                    </button>
                  </form>
                  {alert ? (
                    <form action={deleteAlert}>
                      <input type="hidden" name="id" value={alert.id} />
                      <input type="hidden" name="voltar" value={`${back}#alerta`} />
                      <button type="submit" className="text-xs font-semibold text-faint underline hover:text-surface">
                        Remover alerta
                      </button>
                    </form>
                  ) : null}
                </>
              ) : (
                <Link
                  href={loginHref}
                  className="flex h-[46px] items-center justify-center rounded-[9px] bg-brand text-[15px] font-semibold text-surface transition-colors hover:bg-brand-dark"
                >
                  Entrar para criar alerta
                </Link>
              )}
              {lowestCents ? <span className="text-xs text-faint">Preço atual: {money(lowestCents)}</span> : null}
            </div>

            <dl className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-5">
              <span className="text-[13px] font-bold">Resumo da comparação</span>
              <Row term="Lojas com o produto" value={String(storeCount)} />
              <Row term="Ofertas monitoradas" value={String(offerCount)} />
              <Row
                term="Diferença entre a maior e a menor"
                value={spread ? money(spread) : "—"}
                accent={spread ? "text-good" : undefined}
              />
              <Row
                term="Última coleta"
                value={freshestMinutesAgo === null ? "—" : elapsed(freshestMinutesAgo)}
              />
            </dl>
          </aside>
        </div>
      </main>

      {/* Mobile: the comparison CTA stays reachable without covering content. */}
      {best && lowestCents !== null ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 lg:hidden">
          <div className="flex flex-none flex-col">
            <span className="text-[10px] text-muted">Menor preço</span>
            <span className="text-lg font-extrabold tracking-[-0.03em]">{money(lowestCents)}</span>
          </div>
          <a
            href={`/go/${best.shortCode}`}
            rel="sponsored nofollow noopener"
            target="_blank"
            className="flex h-12 flex-1 items-center justify-center rounded-[10px] bg-brand text-[15px] font-semibold text-surface"
          >
            Ver melhor oferta
          </a>
        </div>
      ) : null}

      <SiteFooter />
    </>
  );
}

function Row({ term, value, accent }: { term: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <dt className="text-muted">{term}</dt>
      <dd className={`font-bold ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}
