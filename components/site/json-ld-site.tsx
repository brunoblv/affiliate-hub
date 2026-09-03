import { getSiteUrl } from "@/lib/site-url";
import { EMAIL_CONTATO, INSTAGRAM_URL } from "@/lib/site-publico";

export function JsonLdSite() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Meu Novo Lar",
        url: siteUrl,
        email: EMAIL_CONTATO,
        sameAs: [INSTAGRAM_URL],
      },
      {
        "@type": "WebSite",
        name: "Meu Novo Lar",
        url: siteUrl,
        inLanguage: "pt-BR",
        publisher: { "@type": "Organization", name: "Meu Novo Lar", url: siteUrl },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/buscar?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
