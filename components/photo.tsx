import { SafeImage } from "./safe-image";

/**
 * Product imagery placeholder.
 *
 * Real photos arrive from the stores with URLs that expire, so the missing-image
 * case is a first-class state rather than a broken <img> (RF-14).
 */
export function Photo({
  label,
  className = "",
  rounded = "rounded-[10px]",
}: {
  label?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`photo-placeholder flex items-center justify-center ${rounded} ${className}`}
      role="img"
      aria-label={label ? `Imagem do produto: ${label}` : "Imagem do produto indisponível"}
    >
      {label ? (
        <span className="px-2 text-center font-mono text-[11px] text-faint">{label}</span>
      ) : null}
    </div>
  );
}

/**
 * Foto real de capa quando existe; sem foto (ou URL quebrada) cai no placeholder,
 * sem interromper a página (RF-14).
 */
export function ProductImage({
  product,
  className = "",
  rounded = "rounded-[10px]",
}: {
  product: { name: string; images: { url: string; alt: string }[] };
  className?: string;
  rounded?: string;
}) {
  const cover = product.images[0];
  if (!cover) return <Photo className={className} rounded={rounded} />;
  return (
    <SafeImage
      src={cover.url}
      alt={cover.alt}
      className={className}
      rounded={rounded}
      fallback={<Photo className={className} rounded={rounded} />}
    />
  );
}
