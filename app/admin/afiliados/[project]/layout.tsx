import { PageHeader } from "@/components/admin/page-header";
import { ProjectSubnav } from "@/components/admin/project-subnav";
import { getProjectBySlug } from "@/lib/projects";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ project: string }>;
}) {
  const { project: slug } = await params;
  const project = await getProjectBySlug(slug);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Afiliados — ${project.name}`}
        description={project.description ?? "Operação de afiliados separada dos demais projetos."}
      />
      <ProjectSubnav projectSlug={slug} />
      {children}
    </div>
  );
}
