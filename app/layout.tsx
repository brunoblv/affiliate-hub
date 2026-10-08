import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: {
    default: "Capibusca — compare preços entre lojas",
    template: "%s · Capibusca",
  },
  icons: { icon: "/capi/face-wink.png", apple: "/capi/face-wink.png" },
  description:
    "Pesquise um produto e compare as ofertas monitoradas nas principais lojas em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Nunito:wght@900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-raised"
        >
          Ir para o conteúdo
        </a>
        {children}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
