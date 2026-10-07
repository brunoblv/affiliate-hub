/**
 * Capa dos posts. Com imagem própria, mostra a foto; sem ela, a capa ilustrada da marca:
 * fundo de cor, círculo, a Capi e uma frase curta (Post.coverText, senão a linha editorial).
 * Cor e mascote saem do slug, então o mesmo post tem sempre a mesma capa.
 */
const TONES = [
  { bg: "#E8F6EF", circle: "#C9EBD9", ink: "#087A4D" },
  { bg: "#FFF4E3", circle: "#FFE2B8", ink: "#8A4B00" },
  { bg: "#E3F8EA", circle: "#BFEFCF", ink: "#15803D" },
  { bg: "#172033", circle: "#24304A", ink: "#FFFFFF" },
  { bg: "#16A66A", circle: "#2BB77B", ink: "#FFFFFF" },
  { bg: "#F3F5F2", circle: "#E7EAE7", ink: "#172033" },
] as const;

// Só recortes sem fundo próprio (a wow.png tem fundo quadrado e destoa).
const MASCOTS = ["compare", "watch", "sleep", "best", "drop2"] as const;

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

export type CoverSize = "lg" | "md" | "sm";

const SIZES: Record<CoverSize, { radius: string; label: string; inset: string; circle: string; img: string }> = {
  lg: { radius: "rounded-[20px]", label: "left-6 bottom-6 max-w-[40%] text-[clamp(22px,3.2vw,32px)]", inset: "left-6 top-[22px]", circle: "-right-[6%] -bottom-[30%] w-[62%]", img: "right-[6%] h-[86%]" },
  md: { radius: "rounded-[14px]", label: "left-4 bottom-4 max-w-[42%] text-[20px]", inset: "", circle: "-right-[8%] -bottom-[34%] w-[64%]", img: "right-[4%] h-[84%]" },
  sm: { radius: "rounded-xl", label: "", inset: "", circle: "-right-[10%] -bottom-[36%] w-[70%]", img: "right-[4%] h-[82%]" },
};

export interface CoverData {
  slug: string;
  title: string;
  coverText?: string | null;
  cover?: { url: string; alt: string | null } | null;
}

export function PostCover({
  post,
  label,
  size,
  eyebrow,
  className = "",
  eager = false,
}: {
  post: CoverData;
  /** Frase da capa ilustrada quando o post não tem coverText (ex.: a linha editorial). */
  label?: string | null;
  size: CoverSize;
  /** Rótulo pequeno no topo da capa ilustrada grande. */
  eyebrow?: string | null;
  className?: string;
  eager?: boolean;
}) {
  const box = SIZES[size];
  const aspect = size === "sm" ? "aspect-[16/10]" : "aspect-[16/9]";

  if (post.cover?.url) {
    return (
      <div className={`relative overflow-hidden bg-blog-soft ${aspect} ${box.radius} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.cover.url} alt={post.cover.alt || post.title} loading={eager ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }

  const seed = hash(post.slug);
  const tone = TONES[seed % TONES.length]!;
  const mascot = MASCOTS[(seed >>> 3) % MASCOTS.length]!;
  const text = post.coverText?.trim() || label?.trim() || "";

  return (
    <div className={`relative overflow-hidden ${aspect} ${box.radius} ${className}`} style={{ background: tone.bg }} role="img" aria-label={post.title}>
      <div className={`absolute aspect-square rounded-full ${box.circle}`} style={{ background: tone.circle }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/capi/${mascot}.png`} alt="" loading={eager ? "eager" : "lazy"} className={`absolute bottom-0 block w-auto max-w-[54%] object-contain object-right-bottom ${box.img}`} />
      {size === "lg" && eyebrow ? (
        <span className={`absolute font-mono text-xs font-medium uppercase tracking-[0.04em] ${box.inset}`} style={{ color: tone.ink }}>
          {eyebrow}
        </span>
      ) : null}
      {box.label && text ? (
        <span className={`absolute z-10 font-blog-brand font-black leading-[1.05] tracking-[-0.02em] [text-wrap:balance] ${box.label}`} style={{ color: tone.ink }}>
          {text}
        </span>
      ) : null}
    </div>
  );
}
