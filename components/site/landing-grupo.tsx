"use client";

import { Bell, Lock, Percent, Sparkles, Tag, Users } from "lucide-react";
import { primeiraImagem } from "@/lib/produtos";
import { reais } from "@/lib/vitrine/rotulos";

export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function IconeTelegram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M22.05 2.94a1.62 1.62 0 00-1.68-.24L1.6 10.3a1.53 1.53 0 00.1 2.87l4.75 1.5 1.83 5.92a1.4 1.4 0 002.32.6l2.6-2.44 4.68 3.46a1.55 1.55 0 002.44-.9l3.12-16.5a1.6 1.6 0 00-.39-1.87zM8.98 13.9l-1.02 4.5-1.2-3.9L18.4 6.4z" />
    </svg>
  );
}

export function IconeCanal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 11a8 8 0 0116 0M7 11a5 5 0 0110 0" strokeLinecap="round" />
      <circle cx="12" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BotaoGrupoWhatsapp({
  href,
  className = "",
  tamanho = "grande",
}: {
  href: string;
  className?: string;
  tamanho?: "grande" | "barra";
}) {
  const tamanhoClasse =
    tamanho === "barra"
      ? "h-12 px-5 text-sm"
      : "h-14 px-6 text-[15px] sm:h-16 sm:text-base";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => window.fbq?.("track", "Contact")}
      className={`inline-flex w-full max-w-lg items-center justify-center gap-3 rounded-full bg-[#25D366] font-bold tracking-wide text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition hover:bg-[#1fbe5a] active:translate-y-px ${tamanhoClasse} ${className}`}
    >
      <IconeWhatsApp className={tamanho === "barra" ? "size-5" : "size-6"} />
      Entrar no grupo do WhatsApp
      <span aria-hidden="true" className="text-lg leading-none">
        →
      </span>
    </a>
  );
}

export function OutrosCanaisGrupo({
  telegram,
  canalWhatsapp,
  className = "",
}: {
  telegram?: string | null;
  canalWhatsapp?: string | null;
  className?: string;
}) {
  if (!telegram && !canalWhatsapp) return null;

  return (
    <div className={`flex w-full max-w-lg flex-wrap gap-2.5 ${className}`}>
      {canalWhatsapp && (
        <a
          href={canalWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => window.fbq?.("track", "Contact")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:bg-secondary active:translate-y-px"
        >
          <IconeCanal className="size-4 text-[#25D366]" />
          Canal no WhatsApp
        </a>
      )}
      {telegram && (
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => window.fbq?.("track", "Contact")}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:bg-secondary active:translate-y-px"
        >
          <IconeTelegram className="size-4 text-[#229ED9]" />
          Telegram
        </a>
      )}
    </div>
  );
}

export type ItemMockupGrupo = {
  id: string;
  nome: string;
  imagens: unknown;
  precoAtual: unknown;
  precoOriginal: unknown | null;
  desconto: number;
};

const MENSAGENS_EXEMPLO = [
  { loja: "Shopee", texto: "Fone sem fio com desconto bom hoje" },
  { loja: "TikTok Shop", texto: "Achadinho que acabou de sair, ainda com estoque" },
  { loja: "Mercado Livre", texto: "Cupom valendo só até hoje à noite" },
];

export function MockupCelularGrupo({ itens }: { itens: ItemMockupGrupo[] }) {
  return (
    <div className="relative mx-auto w-[min(100%,320px)]">
      <div
        className="absolute -top-6 -right-2 z-10 max-w-44 rotate-3 rounded-2xl bg-olive px-3 py-2 text-center text-[13px] font-bold leading-tight text-white shadow-md sm:-right-8"
        aria-hidden="true"
      >
        Ofertas de casa na palma da mão
      </div>
      <div className="rounded-[2.4rem] border-10 border-foreground bg-card p-3 shadow-[0_24px_60px_rgba(41,40,36,0.18)]">
        <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-foreground" />
        <div className="rounded-2xl bg-secondary px-3 py-2 text-center">
          <div className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">ACHADINHOS</div>
          <div className="text-sm font-bold text-foreground">Achados do dia</div>
        </div>
        {itens.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {itens.map((item) => {
              const imagem = primeiraImagem({ imagens: item.imagens as never });
              return (
                <li key={item.id} className="flex items-center gap-2.5 rounded-xl bg-secondary p-2">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card">
                    {imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagem} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="size-6 rounded bg-sand" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[12px] font-semibold text-foreground">{item.nome}</div>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                      {item.precoOriginal != null && (
                        <span className="text-[10px] text-muted-foreground line-through">{reais(item.precoOriginal)}</span>
                      )}
                      <span className="text-[13px] font-extrabold text-foreground">{reais(item.precoAtual)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-olive px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{item.desconto}%
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {MENSAGENS_EXEMPLO.map((msg) => (
              <li key={msg.loja} className="rounded-xl border border-sage/40 bg-secondary px-3 py-2.5 text-left">
                <div className="text-[10px] font-bold tracking-wide text-olive">{msg.loja}</div>
                <div className="mt-0.5 text-[13px] font-semibold text-foreground">{msg.texto}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const BENEFICIOS = [
  { icon: Tag, texto: "Ofertas da Shopee, TikTok Shop e Mercado Livre" },
  { icon: Percent, texto: "Descontos e cupons quando a loja solta" },
  { icon: Sparkles, texto: "Qualquer categoria — casa, tecnologia, moda e mais" },
  { icon: Bell, texto: "Você vê a promoção na hora, no WhatsApp" },
];

export function ListaBeneficiosGrupo() {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {BENEFICIOS.map(({ icon: Icone, texto }) => (
        <li
          key={texto}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-sm font-semibold text-foreground"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Icone className="size-4 text-sage" />
          </span>
          {texto}
        </li>
      ))}
    </ul>
  );
}

const SELOS = [
  { icon: Lock, texto: "Gratuito" },
  { icon: Users, texto: "Ofertas ao longo da semana" },
  { icon: Sparkles, texto: "Só oferta que vale a pena" },
];

export function SelosConfiancaGrupo() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {SELOS.map(({ icon: Icone, texto }) => (
        <li key={texto} className="flex items-center gap-1.5">
          <Icone className="size-3.5" />
          {texto}
        </li>
      ))}
    </ul>
  );
}
