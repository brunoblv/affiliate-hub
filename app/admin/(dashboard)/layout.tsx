import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { UserMenu } from "@/components/admin/user-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, projects] = await Promise.all([
    auth(),
    prisma.affiliateProject.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar projects={projects} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground max-w-xs">
            <span className="size-3 rounded-full border border-current" />
            <span className="text-xs">Buscar...</span>
          </div>
          <div className="flex-1" />
          <UserMenu name={session?.user?.name} email={session?.user?.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
