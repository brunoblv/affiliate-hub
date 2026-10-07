import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { splitBlocks, type BodyBlock } from "@/lib/blog/body";
import { getCatalogProductsBySlugs } from "@/lib/catalog";
import { mainSiteUrl } from "@/lib/blog/hosts";
import { FeaturedProductCard, ProductGridCard } from "./product-cards";

type Group = Exclude<BodyBlock, { kind: "product" }> | { kind: "products"; slugs: string[] };

/** Cards de produto seguidos (sem texto entre eles) viram uma grade; um sozinho vira destaque. */
function groupProducts(blocks: BodyBlock[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    if (block.kind !== "product") {
      groups.push(block);
      continue;
    }
    const last = groups.at(-1);
    if (last?.kind === "products") last.slugs.push(block.slug);
    else groups.push({ kind: "products", slugs: [block.slug] });
  }
  return groups;
}

/** Links internos /go saem pelo site principal (o subdomínio só serve o blog). */
function absoluteHref(href: string): string {
  return href.startsWith("/go/") ? mainSiteUrl(href) : href;
}

/**
 * Corpo do post: markdown, imagens no meio do texto, cards de produto e botões de CTA.
 * Server Component: os produtos vêm do catálogo numa consulta só.
 */
export async function PostBody({ body, hasAffiliateLinks }: { body: string; hasAffiliateLinks: boolean }) {
  const blocks = splitBlocks(body);
  const slugs = blocks.flatMap((block) => (block.kind === "product" ? [block.slug] : []));
  const products = await getCatalogProductsBySlugs(slugs);
  const affiliate = hasAffiliateLinks || products.size > 0 || blocks.some((block) => block.kind === "cta");

  return (
    <div className="flex flex-col gap-8">
      {groupProducts(blocks).map((group, index) => {
        if (group.kind === "markdown") {
          return (
            <div key={index} className="blog-prose">
              <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  img: ({ src, alt }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(src ?? "")} alt={alt ?? ""} loading="lazy" className="mx-auto h-auto max-h-[28rem] w-full rounded-lg object-contain" />
                  ),
                  a: ({ href, children }) => {
                    const url = absoluteHref(String(href ?? ""));
                    const external = /^https?:\/\//.test(url);
                    return external ? (
                      <a href={url} target="_blank" rel="nofollow sponsored noopener">
                        {children}
                      </a>
                    ) : (
                      <a href={url}>{children}</a>
                    );
                  },
                }}
              >
                {group.content}
              </Markdown>
            </div>
          );
        }

        if (group.kind === "cta") {
          return (
            <p key={index} className="flex justify-center">
              <a
                href={absoluteHref(group.url)}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="inline-flex w-full max-w-md items-center justify-center rounded-lg bg-blog-ink px-6 py-3 text-center text-sm font-semibold text-blog-surface hover:opacity-90"
              >
                {group.label}
              </a>
            </p>
          );
        }

        // Produto despublicado ou removido: o post continua de pé, sem card quebrado.
        const items = group.slugs.flatMap((slug) => {
          const item = products.get(slug);
          return item ? [item] : [];
        });
        if (items.length === 0) return null;
        if (items.length === 1) return <FeaturedProductCard key={index} item={items[0]!} />;
        return (
          <div key={index} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <ProductGridCard key={item.product.id} item={item} />
            ))}
          </div>
        );
      })}

      {affiliate ? (
        <p className="text-xs text-blog-muted">
          Esta página contém links de afiliado. Se você comprar por eles, o site pode receber uma comissão, sem custo adicional
          para você.
        </p>
      ) : null}
    </div>
  );
}
