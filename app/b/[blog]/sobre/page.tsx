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
    <article className="mx-auto w-full max-w-[760px] px-5 pt-12">
      <div className="flex items-center gap-5 overflow-hidden rounded-[20px] bg-blog-accent-soft pl-4 pr-7 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/capi/compare.png" alt="" className="block h-[100px] w-auto flex-none self-end sm:h-[130px]" />
        <h1 className="pb-4 text-[clamp(26px,5vw,36px)] font-extrabold leading-[1.1] tracking-[-0.035em]">Sobre o {blog.name}</h1>
      </div>
      <div className="blog-prose mt-8">
        <Markdown remarkPlugins={[remarkGfm]}>{blog.about}</Markdown>
      </div>
    </article>
  );
}
