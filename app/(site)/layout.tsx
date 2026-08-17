import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

/**
 * Todas as páginas públicas leem o banco direto (sem `fetch`), então sem isto
 * o Next as prerenderiza no build e serve o HTML congelado para sempre
 * (`Cache-Control: s-maxage=31536000`). Era o que fazia o site mostrar preço
 * antigo do Mercado Livre e post já apagado. 5 min é o teto de defasagem; as
 * Server Actions do admin ainda revalidam na hora com `revalidatePath`.
 */
export const revalidate = 300;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
