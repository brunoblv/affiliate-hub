import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlog } from "@/lib/blog/queries";

type Props = { params: Promise<{ blog: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const blog = await getBlog((await params).blog);
  return blog ? { title: `Sobre o ${blog.name}`, alternates: { canonical: "/sobre" } } : {};
}

export default async function BlogAboutPage({ params }: Props) {
  const blog = await getBlog((await params).blog);
  if (!blog?.about) notFound();

  return (
    <article className="mx-auto w-full max-w-[720px] px-5 py-12">
      <h1 className="font-blog-heading text-4xl font-semibold">Sobre o {blog.name}</h1>
      <div className="blog-prose mt-8">
        <Markdown remarkPlugins={[remarkGfm]}>{blog.about}</Markdown>
      </div>
    </article>
  );
}
