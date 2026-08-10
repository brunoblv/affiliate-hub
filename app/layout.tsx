import type { Metadata } from "next";
import { Newsreader, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/** GA4 Measurement ID — público; também pode vir de NEXT_PUBLIC_GA_ID. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-ZL1R0ZBN9J";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meu Novo Lar",
  description: "Ideias, produtos e ferramentas para o seu lar",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            // Uma linha: o SSR do Next às vezes corta `window.dataLayer = ...` em multilinha
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
