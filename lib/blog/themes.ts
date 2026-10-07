import type { CSSProperties } from "react";

/**
 * Identidade visual de cada blog (cores e fontes), aplicada como variáveis CSS no layout
 * do blog. Blog sem tema próprio usa o padrão neutro. Cores usadas pelas classes
 * `*-blog-*` declaradas em app/globals.css.
 */
export interface BlogTheme {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  soft: string;
  accent: string;
  accentDark: string;
  accentInk: string;
  /** Família das fontes (com fallback) e URL do Google Fonts que as carrega. */
  headingFont: string;
  bodyFont: string;
  fontsHref: string | null;
  /** Capa usada quando o post não tem imagem própria (arquivo em public/). */
  fallbackCover: { src: string; alt: string } | null;
}

const DEFAULT_THEME: BlogTheme = {
  background: "#fafbf9",
  surface: "#ffffff",
  ink: "#172033",
  muted: "#667085",
  line: "#e7eae7",
  soft: "#f1f2f5",
  accent: "#16a66a",
  accentDark: "#087a4d",
  accentInk: "#ffffff",
  headingFont: "Inter, Helvetica, Arial, sans-serif",
  bodyFont: "Inter, Helvetica, Arial, sans-serif",
  fontsHref: null,
  fallbackCover: null,
};

const THEMES: Record<string, Partial<BlogTheme>> = {
  // Paleta "Meu Novo Lar": creme, terracota, sálvia e oliva.
  meunovolar: {
    background: "#F8F6F1",
    surface: "#FFFFFF",
    ink: "#292824",
    muted: "#77736B",
    line: "#DDD7CC",
    soft: "#EDE6DA",
    accent: "#B8664F",
    accentDark: "#8F493A",
    accentInk: "#FFFFFF",
    headingFont: "Newsreader, Georgia, serif",
    bodyFont: "Manrope, 'Segoe UI', sans-serif",
    fontsHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap",
    fallbackCover: {
      src: "/blogs/meunovolar/capa-editorial.jpg",
      alt: "Sala aconchegante com cozinha integrada e iluminação quente",
    },
  },
};

export function blogTheme(subdomain: string): BlogTheme {
  return { ...DEFAULT_THEME, ...THEMES[subdomain] };
}

export function themeStyle(theme: BlogTheme): CSSProperties {
  return {
    "--blog-bg": theme.background,
    "--blog-surface": theme.surface,
    "--blog-ink": theme.ink,
    "--blog-muted": theme.muted,
    "--blog-line": theme.line,
    "--blog-soft": theme.soft,
    "--blog-accent": theme.accent,
    "--blog-accent-dark": theme.accentDark,
    "--blog-accent-ink": theme.accentInk,
    "--blog-heading": theme.headingFont,
    "--blog-body": theme.bodyFont,
  } as CSSProperties;
}
