import Link from "next/link";
import { primeiraImagem } from "@/lib/produtos";
import { Button } from "@/components/ui/button";
import { linkOfertaVitrine } from "@/lib/vitrine/links";
import { LABEL_SELO, reais } from "@/lib/vitrine/rotulos";
import type { SeloLanding } from "@/lib/database/enums";

export interface ProdutoLandingCard {
  id: string;
  nome: string;
  imagens: unknown;
  precoAtual: unknown;
  precoOriginal: unknown | null;
  codigoCurto: string;
  linkAfiliado: string;
}

function descontoDe(produto: ProdutoLandingCard): number | null {
  const atual = Number(produto.precoAtual);
  const original = produto.precoOriginal != null ? Number(produto.precoOriginal) : null;
  if (!original || original <= atual) return null;
  return Math.round(((original - atual) / original) * 100);
}

export function LandingProdutoCard({
  produto,
  titulo,
  descricao,
  selo,
  slugLanding,
}: {
  produto: ProdutoLandingCard;
  titulo: string;
  descricao: string | null;
  selo: SeloLanding | null;
  slugLanding: string;
}) {
  const imagem = primeiraImagem({ imagens: produto.imagens as never });
  const desconto = descontoDe(produto);
  const oferta = linkOfertaVitrine(produto, slugLanding);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex aspect-square items-center justify-center bg-[repeating-linear-gradient(45deg,var(--background),var(--background)_8px,var(--sand)_8px,var(--sand)_16px)] p-3">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt={produto.nome} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">produto</span>
        )}
        {desconto !== null && (
          <span className="absolute top-3 right-3 rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-white">
            -{desconto}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {selo && (
          <span className="mb-2 w-fit rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tracking-wide text-foreground">
            {LABEL_SELO[selo]}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{titulo}</h3>
        {descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{descricao}</p>}
        <div className="mt-3 flex items-baseline gap-2">
          {Number(produto.precoOriginal) > Number(produto.precoAtual) && (
            <span className="text-xs text-muted-foreground line-through">{reais(produto.precoOriginal)}</span>
          )}
          <span className="text-lg font-bold text-foreground">{reais(produto.precoAtual)}</span>
        </div>
        <div className="mt-4">
          {oferta ? (
            <Button
              size="sm"
              render={<a href={oferta} target="_blank" rel="noopener noreferrer sponsored" />}
              className="w-full"
            >
              Ver oferta
            </Button>
          ) : (
            <Button size="sm" disabled className="w-full">
              Oferta indisponível
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CtaGrupos({
  whatsapp,
  telegram,
  variante = "bloco",
}: {
  whatsapp: string | null;
  telegram: string | null;
  variante?: "bloco" | "barra";
}) {
  if (!whatsapp && !telegram) return null;

  if (variante === "barra") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          {whatsapp && (
            <Button size="sm" render={<a href={whatsapp} target="_blank" rel="noopener noreferrer" />} className="flex-1">
              Grupo no WhatsApp
            </Button>
          )}
          {telegram && (
            <Button
              size="sm"
              variant="outline"
              render={<a href={telegram} target="_blank" rel="noopener noreferrer" />}
              className="flex-1"
            >
              Telegram
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sage/40 bg-secondary px-5 py-6 text-center sm:px-8">
      <p className="font-heading text-lg font-semibold text-foreground">Não perca as próximas ofertas</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Entra no grupo e recebe a seleção do dia, sem ter que caçar promoção.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {whatsapp && (
          <Button render={<a href={whatsapp} target="_blank" rel="noopener noreferrer" />}>Entrar no grupo de ofertas</Button>
        )}
        {telegram && (
          <Button variant="outline" render={<a href={telegram} target="_blank" rel="noopener noreferrer" />}>
            Telegram
          </Button>
        )}
      </div>
    </div>
  );
}

export function ArquivoLandings({
  landings,
}: {
  landings: { slug: string; headline: string | null; data: Date }[];
}) {
  if (landings.length === 0) return null;

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-heading text-xl font-semibold text-foreground">Ofertas dos dias anteriores</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {landings.map((item) => (
          <li key={item.slug}>
            <Link href={`/vitrine/${item.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {item.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              {item.headline ? ` — ${item.headline}` : ""}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
