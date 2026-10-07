import { blogUrl } from "@/lib/blog/hosts";
import { getBlog } from "@/lib/blog/queries";

/** robots.txt do subdomínio (o do site principal fica em app/robots.ts). */
export async function GET(_request: Request, context: { params: Promise<{ blog: string }> }) {
  const blog = await getBlog((await context.params).blog);
  if (!blog) return new Response("Not found", { status: 404 });
  const body = ["User-Agent: *", "Allow: /", "Disallow: /busca", "", `Sitemap: ${blogUrl(blog.subdomain, "/sitemap.xml")}`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
