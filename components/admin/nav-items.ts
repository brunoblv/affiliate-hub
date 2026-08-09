import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Flame,
  FolderTree,
  FileText,
  LayoutTemplate,
  Megaphone,
  Send,
  CalendarClock,
  Radio,
  Plug,
  BarChart3,
  MousePointerClick,
  Wallet,
  Bot,
  ListChecks,
  Briefcase,
  ScrollText,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Menu da área administrativa (spec §41). */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Geral",
    items: [{ title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Catálogo",
    items: [
      { title: "Produtos", href: "/admin/products", icon: Package },
      { title: "Oportunidades", href: "/admin/opportunities", icon: Flame },
      { title: "Categorias", href: "/admin/categories", icon: FolderTree },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { title: "Conteúdo", href: "/admin/content", icon: FileText },
      { title: "Templates", href: "/admin/templates", icon: LayoutTemplate },
      { title: "Campanhas", href: "/admin/campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Distribuição",
    items: [
      { title: "Publicações", href: "/admin/publications", icon: Send },
      { title: "Agenda", href: "/admin/schedules", icon: CalendarClock },
      { title: "Canais", href: "/admin/channels", icon: Radio },
      { title: "Integrações", href: "/admin/integrations", icon: Plug },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { title: "Cliques", href: "/admin/analytics/clicks", icon: MousePointerClick },
      { title: "Conversões", href: "/admin/analytics/conversions", icon: BarChart3 },
      { title: "Comissões", href: "/admin/analytics/commissions", icon: Wallet },
    ],
  },
  {
    title: "Afiliados",
    items: [{ title: "Umbanda", href: "/admin/afiliados/umbanda", icon: Sparkles }],
  },
  {
    title: "Automação",
    items: [
      { title: "Autopilot", href: "/admin/autopilot", icon: Bot },
      { title: "Regras", href: "/admin/autopilot/rules", icon: ListChecks },
      { title: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { title: "Logs", href: "/admin/logs", icon: ScrollText },
    ],
  },
  {
    title: "Sistema",
    items: [{ title: "Configurações", href: "/admin/settings", icon: Settings }],
  },
];
