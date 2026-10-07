import { blogUrl } from "@/lib/blog/hosts";
import { getBlog, listPosts } from "@/lib/blog/queries";

export const dynamic = "force-dynamic";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS com os 20 artigos mais recentes (leitores de feed e Pinterest). */
export async function GET(_request: Request, context: { params: Promise<{ blog: string }> }) {
  const blog = await getBlog((await context.params).blog);
  if (!blog) return new Response("Not found", { status: 404 });
  const { posts } = await listPosts(blog.id, 1, 20);

  const items = posts
    .map((post) => {
      const link = blogUrl(blog.subdomain, `/blog/${post.slug}`);
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="true">${escape(link)}</guid>
      ${post.publishedAt ? `<pubDate>${post.publishedAt.toUTCString()}</pubDate>` : ""}
      ${post.summary ? `<description>${escape(post.summary)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(blog.name)}</title>
    <link>${escape(blogUrl(blog.subdomain))}</link>
    <description>${escape(blog.tagline ?? blog.name)}</description>
    <language>pt-BR</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
