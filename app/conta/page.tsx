import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalog";
import { money, moneyShort } from "@/lib/format";
import { asText, type RawParams } from "@/lib/query";
import { deleteAccount, deleteAlert, saveAlert, toggleFavorite } from "@/lib/user/actions";
import { isMailConfigured } from "@/lib/mail";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductImage } from "@/components/photo";

export const metadata: Metadata = {
  title: "Favoritos e alertas",
  robots: { index: false, follow: false },
};

const NAV = [
  { label: "Visão geral", href: "/conta" },
  { label: "Alertas de preço", href: "/conta#alertas" },
  { label: "Favoritos", href: "/conta#favoritos" },
  { label: "Minha conta", href: "/conta#dados" },
];

const linkButton =
  "rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand";

export default async function AccountPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = await searchParams;
  const user = (await auth())?.user;
  if (!user?.id) redirect("/entrar?callbackUrl=/conta");

  const [alerts, favorites] = await Promise.all([
    prisma.priceAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const products = await getProductsByIds([
    ...new Set([...alerts.map((a) => a.productId), ...favorites.map((f) => f.productId)]),
  ]);

  const reached = alerts.filter((alert) => {
    const lowest = products.get(alert.productId)?.prices.lowestCents;
    return lowest != null && lowest <= alert.targetCents;
  });
  const cheaper = favorites.filter((favorite) => {
    const lowest = products.get(favorite.productId)?.prices.lowestCents;
    return lowest != null && favorite.savedAtCents != null && lowest < favorite.savedAtCents;
  });
  const errorMessage = asText(query.erro);
  const okMessage = asText(query.ok);

  return (
    <>
      <SiteHeader />

      <main
        id="conteudo"
        className="mx-auto grid max-w-[1280px] items-start gap-8 px-4 pb-24 pt-9 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]"
      >
        <nav
          aria-label="Seções da conta"
          className="flex gap-1 overflow-x-auto rounded-[14px] border border-line bg-surface p-3 lg:flex-col"
        >
          {NAV.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={`whitespace-nowrap rounded-[9px] px-3.5 py-2.5 text-[13px] ${
                index === 0 ? "bg-brand-soft font-semibold text-brand-dark" : "font-medium"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-10">
          <section>
            <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">
              Olá{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            {errorMessage ? (
              <p role="alert" className="mt-4 rounded-[10px] bg-bad-bg px-4 py-3 text-[13px] font-medium text-bad-ink">
                {errorMessage}
              </p>
            ) : null}
            {okMessage ? (
              <p role="status" className="mt-4 rounded-[10px] bg-good-bg px-4 py-3 text-[13px] font-medium text-good">
                {okMessage}
              </p>
            ) : null}
            <dl className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
              <Stat value={favorites.length} label="favoritos" />
              <Stat value={alerts.length} label="alertas ativos" />
              <Stat value={cheaper.length} label="favoritos que ficaram mais baratos" accent="text-good" />
              <Stat value={reached.length} label="alertas com preço atingido" accent="text-good" />
            </dl>
          </section>

          <section id="alertas" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold tracking-[-0.02em]">Seus alertas</h2>
            {alerts.length === 0 ? (
              <Empty>
                Você ainda não criou alertas. Abra um produto e informe o preço que quer pagar.
              </Empty>
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
                {alerts.map((alert) => {
                  const product = products.get(alert.productId);
                  const lowest = product?.prices.lowestCents ?? null;
                  const back = "/conta#alertas";
                  const hit = lowest !== null && lowest <= alert.targetCents;
                  return (
                    <div
                      key={alert.id}
                      className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line-soft px-5 py-4 last:border-b-0"
                    >
                      {product ? (
                        <div className="flex min-w-[220px] flex-1 items-center gap-3">
                          <ProductImage product={product} className="h-10 w-10 flex-none" rounded="rounded-lg" />
                          <Link href={`/produto/${product.slug}`} className="text-sm font-semibold hover:text-brand">
                            {product.name}
                          </Link>
                        </div>
                      ) : (
                        <span className="min-w-[220px] flex-1 text-sm text-muted">Produto indisponível no momento</span>
                      )}

                      <div className="flex flex-col text-[13px]">
                        <span className="text-muted">Atual</span>
                        <strong>{lowest === null ? "Sem oferta atual" : money(lowest)}</strong>
                      </div>

                      <form action={saveAlert} className="flex items-end gap-2">
                        <input type="hidden" name="productId" value={alert.productId} />
                        <input type="hidden" name="voltar" value={back} />
                        <label className="flex flex-col gap-1 text-[13px]">
                          <span className="text-muted">Desejado (R$)</span>
                          <input
                            name="target"
                            inputMode="decimal"
                            defaultValue={(alert.targetCents / 100).toFixed(2).replace(".", ",")}
                            className="h-9 w-[110px] rounded-lg border border-line bg-surface px-2.5 text-[13px] font-semibold outline-none focus:border-brand"
                          />
                        </label>
                        <button type="submit" className={linkButton}>
                          Atualizar
                        </button>
                      </form>

                      <span
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                          hit ? "bg-good-bg text-good" : "bg-warn-bg text-warn-ink"
                        }`}
                      >
                        {lowest === null ? "Aguardando oferta" : hit ? "Preço atingido" : "Aguardando queda"}
                      </span>
                      {alert.notifiedAt ? (
                        <span className="text-xs text-muted">
                          Avisado por e-mail em {alert.notifiedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </span>
                      ) : null}

                      <form action={deleteAlert}>
                        <input type="hidden" name="id" value={alert.id} />
                        <input type="hidden" name="voltar" value={back} />
                        <button type="submit" className={`${linkButton} text-bad`}>
                          Remover
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              {isMailConfigured()
                ? `Quando o menor preço chegar à sua meta, avisamos por e-mail (${user.email}), uma vez por queda.`
                : "O status aparece aqui. O aviso por e-mail ainda não está ativo neste ambiente."}
            </p>
          </section>

          <section id="favoritos" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold tracking-[-0.02em]">Favoritos</h2>
            {favorites.length === 0 ? (
              <Empty>Você ainda não salvou nenhum produto.</Empty>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                {favorites.map((favorite) => {
                  const product = products.get(favorite.productId);
                  const lowest = product?.prices.lowestCents ?? null;
                  const saved = favorite.savedAtCents;
                  const delta = lowest !== null && saved !== null ? lowest - saved : null;
                  const tone =
                    delta === null || delta === 0
                      ? "bg-canvas text-muted"
                      : delta < 0
                        ? "bg-good-bg text-good"
                        : "bg-bad-bg text-bad-ink";
                  const label =
                    delta === null
                      ? "Sem comparação de preço ainda"
                      : delta < 0
                        ? `${money(-delta)} mais barato desde que você salvou`
                        : delta > 0
                          ? `${money(delta)} mais caro desde que você salvou`
                          : "Preço estável desde que você salvou";

                  return (
                    <article
                      key={favorite.id}
                      className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4"
                    >
                      {product ? (
                        <>
                          <ProductImage product={product} className="aspect-[4/3]" />
                          <h3 className="text-sm font-semibold leading-snug">
                            <Link href={`/produto/${product.slug}`} className="hover:text-brand">
                              {product.name}
                            </Link>
                          </h3>
                        </>
                      ) : (
                        <p className="py-6 text-center text-sm text-muted">Produto indisponível no momento</p>
                      )}
                      <div className="flex flex-col gap-0.5">
                        {saved !== null ? (
                          <span className="text-xs text-muted">Quando você salvou: {moneyShort(saved)}</span>
                        ) : null}
                        <span className="text-[22px] font-extrabold tracking-[-0.03em]">
                          {lowest === null ? "Sem oferta atual" : moneyShort(lowest)}
                        </span>
                      </div>
                      {product ? <span className={`rounded-[7px] px-2.5 py-2 text-xs font-semibold ${tone}`}>{label}</span> : null}
                      <form action={toggleFavorite}>
                        <input type="hidden" name="productId" value={favorite.productId} />
                        <input type="hidden" name="voltar" value="/conta#favoritos" />
                        <button type="submit" className={`${linkButton} text-bad`}>
                          Remover dos favoritos
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section id="dados" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold tracking-[-0.02em]">Minha conta</h2>
            <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
              <dl className="grid gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
                <dt className="text-muted">Nome</dt>
                <dd className="font-medium">{user.name ?? "—"}</dd>
                <dt className="text-muted">E-mail</dt>
                <dd className="font-medium">{user.email}</dd>
                <dt className="text-muted">Entrada</dt>
                <dd className="font-medium">Conta Google</dd>
              </dl>

              <details className="border-t border-line pt-4">
                <summary className="cursor-pointer text-[13px] font-semibold text-bad">Excluir minha conta</summary>
                <form action={deleteAccount} className="mt-3 flex flex-col gap-3">
                  <p className="text-[13px] text-muted">
                    Apaga sua conta, seus favoritos e seus alertas. Não dá para desfazer. Para voltar, é só entrar de
                    novo com o Google e começar do zero.
                  </p>
                  <div>
                    <button type="submit" className="h-9 rounded-lg bg-bad px-4 text-[13px] font-semibold text-surface">
                      Excluir definitivamente
                    </button>
                  </div>
                </form>
              </details>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[14px] border border-dashed border-line bg-surface p-6 text-sm text-muted">{children}</p>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-surface p-5">
      <dt className="sr-only">{label}</dt>
      <dd className="flex flex-col gap-1.5">
        <span className={`text-[32px] font-extrabold tracking-[-0.04em] ${accent ?? ""}`}>{value}</span>
        <span className="text-[13px] text-muted">{label}</span>
      </dd>
    </div>
  );
}
