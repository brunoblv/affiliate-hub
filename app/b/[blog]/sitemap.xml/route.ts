import { blogUrl } from "@/lib/blog/hosts";
import { getBlog, sitemapPosts } from "@/lib/blog/queries";

export const dynamic = "force-dynamic";

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sitemap do subdomínio: raiz, /sobre e os artigos editoriais publicados. */
export async function GET(_request: Request, context: { params: Promise<{ blog: string }> }) {
  const blog = await getBlog((await context.params).blog);
  if (!blog) return new Response("Not found", { status: 404 });
  const posts = await sitemapPosts(blog.id);

  const entries = [
    { loc: blogUrl(blog.subdomain), lastmod: posts[0]?.updatedAt ?? blog.updatedAt },
    ...(blog.about ? [{ loc: blogUrl(blog.subdomain, "/sobre"), lastmod: blog.updatedAt }] : []),
    ...posts.map((post) => ({ loc: blogUrl(blog.subdomain, `/blog/${post.slug}`), lastmod: post.updatedAt })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url><loc>${escape(entry.loc)}</loc><lastmod>${entry.lastmod.toISOString()}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
