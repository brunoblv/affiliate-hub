import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, ShoppingBag, Newspaper, Send, Radio, Plug, Users } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Menu da área administrativa v2 (docs/hub/especificacao-affiliate-hub-v2.md §10)
 * — as 7 telas da spec, completas.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Geral",
    items: [{ title: "Painel", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Conteúdo",
    items: [
      { title: "Produtos", href: "/admin/produtos", icon: Package },
      { title: "Produtos Shopee", href: "/admin/produtos/shopee", icon: ShoppingBag },
      { title: "Posts", href: "/admin/posts", icon: Newspaper },
    ],
  },
  {
    title: "Distribuição",
    items: [
      { title: "Fila", href: "/admin/fila", icon: Send },
      { title: "Canais", href: "/admin/canais", icon: Radio },
      { title: "Integrações", href: "/admin/integracoes", icon: Plug },
    ],
  },
  {
    title: "Assinantes",
    items: [{ title: "Assinantes", href: "/admin/assinantes", icon: Users }],
  },
];
