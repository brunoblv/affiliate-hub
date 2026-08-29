import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permite carregar assets/HMR do dev server quando acessado via túnel ngrok
  // (necessário para o fluxo OAuth do Mercado Livre, que exige redirect_uri público).
  allowedDevOrigins: ["litigate-epidemic-dynamite.ngrok-free.dev"],
  // Baileys (WhatsApp) tenta um import dinâmico opcional de "jimp" (fallback
  // de processamento de imagem, não instalado — usamos sharp) e o bundler
  // tenta resolvê-lo estaticamente e quebra o build. Deixar o pacote de fora
  // do bundle do servidor resolve via require nativo em runtime.
  serverExternalPackages: ["@whiskeysockets/baileys", "@prisma/adapter-pg", "pg"],
  transpilePackages: ["@mdxeditor/editor"],
  // Necessário em produção (self-hosted atrás de nginx): o Next.js compara o
  // header Origin com o Host visto internamente pelo servidor para bloquear
  // CSRF em Server Actions; sem isso, cliques em botões que chamam Server
  // Actions (ex: "Rodar descoberta agora") falham em silêncio.
  experimental: {
    serverActions: {
      allowedOrigins: ["meunovolar.com", "www.meunovolar.com"],
    },
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/admin/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
