import type { CSSProperties } from "react";

/**
 * Identidade visual dos blogs, aplicada como variáveis CSS no layout do blog (classes
 * `*-blog-*` em app/globals.css). O padrão é a marca Capibusca (Inter + Nunito, verde),
 * com a Capi como mascote; um blog pode sobrescrever cores e fontes aqui.
 */
export interface BlogTheme {
  background: string;
  surface: string;
  ink: string;
  /** Texto corrido do artigo (um tom abaixo do título). */
  text: string;
  muted: string;
  line: string;
  soft: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentInk: string;
  /** Títulos e texto. */
  headingFont: string;
  bodyFont: string;
  /** Marca: nome do blog e frases das capas ilustradas. */
  brandFont: string;
  /** Google Fonts extra (as da marca Capibusca já vêm do layout raiz). */
  fontsHref: string | null;
}

const CAPIBUSCA: BlogTheme = {
  background: "#FAFBF9",
  surface: "#FFFFFF",
  ink: "#172033",
  text: "#344054",
  muted: "#667085",
  line: "#E7EAE7",
  soft: "#F3F5F2",
  accent: "#16A66A",
  accentDark: "#087A4D",
  accentSoft: "#E8F6EF",
  accentInk: "#FFFFFF",
  headingFont: "Inter, Helvetica, Arial, sans-serif",
  bodyFont: "Inter, Helvetica, Arial, sans-serif",
  brandFont: "Nunito, Inter, sans-serif",
  fontsHref: null,
};

const THEMES: Record<string, Partial<BlogTheme>> = {};

export function blogTheme(subdomain: string): BlogTheme {
  return { ...CAPIBUSCA, ...THEMES[subdomain] };
}

export function themeStyle(theme: BlogTheme): CSSProperties {
  return {
    "--blog-bg": theme.background,
    "--blog-surface": theme.surface,
    "--blog-ink": theme.ink,
    "--blog-text": theme.text,
    "--blog-muted": theme.muted,
    "--blog-line": theme.line,
    "--blog-soft": theme.soft,
    "--blog-accent": theme.accent,
    "--blog-accent-dark": theme.accentDark,
    "--blog-accent-soft": theme.accentSoft,
    "--blog-accent-ink": theme.accentInk,
    "--blog-heading": theme.headingFont,
    "--blog-body": theme.bodyFont,
    "--blog-brand": theme.brandFont,
  } as CSSProperties;
}
