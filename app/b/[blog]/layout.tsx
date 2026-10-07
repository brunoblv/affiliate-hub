import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogFooter, BlogHeader } from "@/components/blog/blog-chrome";
import { blogUrl } from "@/lib/blog/hosts";
import { getBlog } from "@/lib/blog/queries";
import { blogTheme, themeStyle } from "@/lib/blog/themes";

/**
 * Layout dos blogs servidos em <subdomínio>.capibusca.com.br (o proxy reescreve para
 * /b/<subdomínio>). As páginas leem o banco direto: sem isto o HTML ficaria congelado
 * no primeiro acesso. As ações do admin ainda revalidam na hora.
 */
export const revalidate = 300;

type Props = { children: React.ReactNode; params: Promise<{ blog: string }> };

export async function generateMetadata({ params }: { params: Promise<{ blog: string }> }): Promise<Metadata> {
  const blog = await getBlog((await params).blog);
  if (!blog) return {};
  return {
    metadataBase: new URL(blogUrl(blog.subdomain)),
    title: { default: blog.name, template: `%s · ${blog.name}` },
    description: blog.tagline ?? undefined,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    openGraph: { siteName: blog.name, locale: "pt_BR" },
  };
}

export default async function BlogLayout({ children, params }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog) notFound();
  const theme = blogTheme(blog.subdomain);

  return (
    <div style={themeStyle(theme)} className="flex min-h-svh flex-col bg-blog-bg font-blog-body text-blog-ink">
      {theme.fontsHref ? <link rel="stylesheet" href={theme.fontsHref} precedence="default" /> : null}
      <BlogHeader blog={blog} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <BlogFooter blog={blog} />
    </div>
  );
}
