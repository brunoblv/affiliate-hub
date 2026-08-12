import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Baileys usa `require`/import dinâmico internos pra jimp/sharp (processamento
  // de imagem opcional, com fallback em runtime) que o bundler do Next não
  // consegue resolver estaticamente — precisa rodar via `require` nativo do
  // Node em vez de ser empacotado.
  serverExternalPackages: ["@whiskeysockets/baileys"],
  // Permite carregar assets/HMR do dev server quando acessado via túnel ngrok
  // (necessário para o fluxo OAuth do Mercado Livre, que exige redirect_uri público).
  allowedDevOrigins: ["litigate-epidemic-dynamite.ngrok-free.dev"],
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
