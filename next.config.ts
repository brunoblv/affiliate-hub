import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permite carregar assets/HMR do dev server quando acessado via túnel ngrok
  // (necessário para o fluxo OAuth do Mercado Livre, que exige redirect_uri público).
  allowedDevOrigins: ["litigate-epidemic-dynamite.ngrok-free.dev"],
};

export default nextConfig;
