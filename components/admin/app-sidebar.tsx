"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_GROUPS, AFFILIATE_PROJECT_ICON, type NavGroup } from "./nav-items";

export interface AppSidebarProject {
  slug: string;
  name: string;
}

export function AppSidebar({ projects = [] }: { projects?: AppSidebarProject[] }) {
  const pathname = usePathname();

  const projectsGroup: NavGroup = {
    title: "Afiliados",
    items: projects.map((p) => ({
      title: p.name,
      href: `/admin/afiliados/${p.slug}`,
      icon: AFFILIATE_PROJECT_ICON,
    })),
  };

  const groups = projects.length > 0 ? [...NAV_GROUPS.slice(0, 4), projectsGroup, ...NAV_GROUPS.slice(4)] : NAV_GROUPS;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-bold text-primary-foreground">
            M
          </div>
          <div className="leading-tight">
            <div className="font-heading text-sm font-semibold">Meu Novo Lar</div>
            <div className="text-[10px] font-medium tracking-[0.04em] text-muted-foreground">PAINEL ADMIN</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive} render={<Link href={item.href} />}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
