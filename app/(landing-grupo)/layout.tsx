import { CookieBanner } from "@/components/site/cookie-banner";
import { Analytics } from "@/components/site/analytics";

export default function LandingGrupoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#faf8fc]">
      <main>{children}</main>
      <CookieBanner />
      <Analytics />
    </div>
  );
}
