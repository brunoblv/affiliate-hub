import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { findGuide, formatGuideDate, guides } from "@/lib/guides";
import { institutional } from "@/lib/institutional";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guide = findGuide((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guias/${guide.slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description },
  };
}

export default async function GuidePage({ params }: Params) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: { "@type": "Organization", name: guide.author },
    publisher: { "@type": "Organization", name: institutional.siteName },
  };
  const others = guides.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[760px] px-4 pb-24 pt-10 sm:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav aria-label="Trilha" className="text-[13px] text-muted">
          <Link href="/guias" className="hover:text-brand">Guias</Link>
        </nav>
        <article>
          <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.035em]">{guide.title}</h1>
          <p className="mt-3 text-[13px] text-muted">
            Por {guide.author} · publicado em <time dateTime={guide.publishedAt}>{formatGuideDate(guide.publishedAt)}</time>
            {guide.updatedAt !== guide.publishedAt ? (
              <> · atualizado em <time dateTime={guide.updatedAt}>{formatGuideDate(guide.updatedAt)}</time></>
            ) : null}
            {" "}· {guide.readingMinutes} min de leitura
          </p>
          <div className="institutional-prose mt-8">
            <guide.Body />
          </div>
        </article>

        <aside aria-labelledby="outros-guias" className="mt-14 border-t border-line pt-8">
          <h2 id="outros-guias" className="text-lg font-bold">Outros guias</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {others.map((item) => (
              <li key={item.slug}>
                <Link href={`/guias/${item.slug}`} className="text-[15px] font-medium text-brand-dark hover:underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}
