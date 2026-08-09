"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rocket } from "lucide-react";
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
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Rocket className="size-5" />
          <span className="text-sm font-semibold">Affiliate Manager</span>
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
