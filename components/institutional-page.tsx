import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

/** Moldura comum das páginas institucionais: título, data de atualização e texto corrido. */
export function InstitutionalPage({
  title,
  intro,
  updatedAt,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[760px] px-4 pb-24 pt-10 sm:px-8">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">{title}</h1>
        {updatedAt ? <p className="mt-2 text-[13px] text-muted">Última atualização: {updatedAt}</p> : null}
        {intro ? <p className="mt-4 text-[15px] leading-relaxed text-muted">{intro}</p> : null}
        <div className="institutional-prose mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
