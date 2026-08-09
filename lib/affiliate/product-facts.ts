import type { Product } from "@/lib/generated/prisma/client";
import type { ProductFacts } from "@/lib/ai";

/** Converte um Product (campos Decimal) nos fatos estruturados que a IA/templates podem usar (spec §12: nunca inventar dados). */
export function toProductFacts(product: Product): ProductFacts {
  return {
    name: product.name,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
    discountPercent: product.discountPercent ? Number(product.discountPercent) : undefined,
    rating: product.rating ? Number(product.rating) : undefined,
    reviewCount: product.reviewCount ?? undefined,
    soldCount: product.soldCount ?? undefined,
  };
}
