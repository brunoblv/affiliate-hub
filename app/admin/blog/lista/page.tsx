import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/admin-ui";
import { BlogNav, Notice } from "@/components/blog-admin/blog-nav";
import { ListWizard } from "@/components/blog-admin/wizards";
import { blogOptions } from "@/lib/blog/admin-data";

export const metadata: Metadata = { title: "Lista por pauta · Admin", robots: { index: false, follow: false } };

/** Chamadas de IA demoradas (texto e imagens). */
export const maxDuration = 300;

export default async function BlogWizardPage() {
  const blogs = await blogOptions();
  return (
    <AdminShell active="Blogs">
      <PageHeader title="Lista por pauta" subtitle="Roundups de produtos do catálogo por cômodo ou tema, com capa gerada." />
      <BlogNav current="/admin/blog/lista" />
      {blogs.length === 0 ? (
        <Notice tone="bad">
          Cadastre um blog antes em <Link href="/admin/blog/blogs" className="underline">Blogs</Link>.
        </Notice>
      ) : (
        <ListWizard blogs={blogs} />
      )}
    </AdminShell>
  );
}
