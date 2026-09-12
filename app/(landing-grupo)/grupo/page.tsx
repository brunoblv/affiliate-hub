import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Destino } from "@/lib/database";
import { CANAL_WHATSAPP_URL, GRUPO_TELEGRAM_URL, GRUPO_WHATSAPP_URL } from "@/lib/site-publico";
import { getSiteUrl } from "@/lib/site-url";
import { obterConfiguracaoVitrine } from "@/lib/vitrine/configuracao";
import { BotaoCanalWhatsapp, BotaoGrupoWhatsapp, OutrosCanaisGrupo } from "@/components/site/landing-grupo";

export const revalidate = 300;

const TITULO = "Top Ofertas | Achadinhos";
const DESCRICAO =
  "Ofertas e cupons da Shopee, TikTok Shop e Mercado Livre em um só lugar.";

const MARCAS = ["Shopee", "TikTok Shop", "Mercado Livre", "Amazon", "Cupons"];

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${getSiteUrl()}/grupo` },
  robots: { index: false, follow: true },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${getSiteUrl()}/grupo`,
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITULO,
    description: DESCRICAO,
  },
};

async function resolverLinksGrupo(): Promise<{ whatsapp: string; telegram: string }> {
  try {
    const [achadinhos, casa] = await Promise.all([
      obterConfiguracaoVitrine(Destino.TIKTOK_SHOP),
      obterConfiguracaoVitrine(Destino.MEU_NOVO_LAR),
    ]);
    return {
      whatsapp: achadinhos.linkGrupoWhatsapp || casa.linkGrupoWhatsapp || GRUPO_WHATSAPP_URL,
      telegram: achadinhos.linkGrupoTelegram || casa.linkGrupoTelegram || GRUPO_TELEGRAM_URL,
    };
  } catch {
    return { whatsapp: GRUPO_WHATSAPP_URL, telegram: GRUPO_TELEGRAM_URL };
  }
}

export default async function LandingGrupoPage() {
  const links = await resolverLinksGrupo();
  const { whatsapp: href, telegram: hrefTelegram } = links;

  return (
    <section className="flex min-h-svh items-center justify-center px-4 py-16 sm:px-6">
      <div className="relative w-full max-w-xl rounded-[2rem] border border-[#eeeaf2] bg-white px-6 pb-8 pt-14 text-center shadow-[0_24px_70px_rgba(73,38,108,0.12)] sm:px-10 sm:pb-10">
        <div className="absolute -top-12 left-1/2 size-24 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
          <Image
            src="/top-ofertas-avatar.png"
            alt="Foto do perfil Top Ofertas Achadinhos"
            width={160}
            height={160}
            className="size-full object-cover"
            priority
          />
        </div>

        <p className="text-xs font-extrabold tracking-[0.16em] text-[#7c3aed]">OFERTAS SELECIONADAS</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-[#481d73] sm:text-4xl">
          Top Ofertas <span className="text-[#9461bd]">|</span> Achadinhos
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#62576a] sm:text-base">
          Ofertas e cupons de verdade, em qualquer categoria, para você economizar sem perder tempo procurando.
        </p>

        <div className="mt-7 overflow-hidden rounded-2xl bg-[#f4f0f8] py-4">
          <div className="flex w-max animate-[marcas-deslizam_18s_linear_infinite] gap-9 px-5 text-xs font-bold text-[#766b7e] sm:gap-12 sm:text-sm">
            {[...MARCAS, ...MARCAS].map((marca, index) => (
              <span key={`${marca}-${index}`} className="whitespace-nowrap">
                {marca}
              </span>
            ))}
          </div>
        </div>

        <ul className="mt-7 space-y-4 text-left text-sm font-semibold text-[#31273a] sm:text-base">
          <li className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-[#7c3aed]" aria-hidden="true" />
            Ofertas pesquisadas para encontrar preço bom e desconto real
          </li>
          <li className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-[#7c3aed]" aria-hidden="true" />
            Entre grátis e receba as promoções direto no WhatsApp
          </li>
        </ul>

        <div className="mt-8">
          <BotaoGrupoWhatsapp
            href={href}
            posicao="hero"
            className="max-w-none rounded-xl bg-[#20c65a] py-4 text-base shadow-[0_10px_24px_rgba(32,198,90,0.28)] hover:bg-[#19b44f]"
          />
        </div>
        <div className="mt-3">
          <BotaoCanalWhatsapp href={CANAL_WHATSAPP_URL} />
        </div>
        <div className="mt-3 flex justify-center">
          <OutrosCanaisGrupo telegram={hrefTelegram} className="justify-center" />
        </div>

        <div className="mt-8 border-t border-[#eeeaf2] pt-6">
          <div className="flex items-center justify-center gap-2 text-sm font-extrabold tracking-wide text-[#5b2786]">
            <ShieldCheck className="size-5" aria-hidden="true" />
            É CONFIÁVEL
          </div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#766b7e]">
            O grupo é gratuito. Você decide se quer aproveitar cada oferta, e alguns links podem gerar comissão sem custo extra para você.
          </p>
        </div>
      </div>
    </section>
  );
}
