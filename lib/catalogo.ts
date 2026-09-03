import { prisma, Plataforma, type Produto } from "@/lib/database";
import { slugify, chaveCanonicoProduto, slugTemSufixoNumerico } from "@/lib/produtos";
import { idExternoDeSlugMercadoLivre } from "@/lib/nicho";

function variantesNumericasDoSlug(base: string): string[] {
  return Array.from({ length: 48 }, (_, i) => `${base}-${i + 2}`);
}

function ancoraDaChave(chave: string): string | null {
  const ancora = chave
    .split("-")
    .filter((t) => t.length >= 6)
    .sort((a, b) => b.length - a.length)[0];
  return ancora ?? null;
}

/**
 * Achar o produto canônico pra upsert: mesmo anúncio (plataforma+idExterno),
 * mesmo slug base (-2/-3) ou o mesmo título com as palavras em outra ordem.
 */
export async function encontrarProdutoCanonico(
  plataforma: Plataforma,
  nome: string,
  idExterno: string,
): Promise<Produto | null> {
  const porId = await prisma.produto.findUnique({
    where: { plataforma_idExterno: { plataforma, idExterno } },
  });
  if (porId) return porId;

  const base = slugify(nome);
  if (base) {
    const porSlug = await prisma.produto.findFirst({
      where: {
        plataforma,
        OR: [{ slug: base }, { slug: { in: variantesNumericasDoSlug(base) } }, { nome }],
      },
      orderBy: { criadoEm: "asc" },
    });
    if (porSlug) return porSlug;
  }

  const chave = chaveCanonicoProduto(nome);
  const ancora = ancoraDaChave(chave);
  if (!chave || !ancora) return null;

  const candidatos = await prisma.produto.findMany({
    where: {
      plataforma,
      OR: [{ slug: { contains: ancora } }, { nome: { contains: ancora, mode: "insensitive" } }],
    },
    take: 50,
    orderBy: { criadoEm: "asc" },
  });
  return candidatos.find((p) => chaveCanonicoProduto(p.nome) === chave) ?? null;
}

/** Resolve slug atual, legado mercado_livre-mlb… ou cópia `-2`/`-3` (redirect fica a cargo da página). */
export async function buscarProdutoPorSlugPublico(slug: string): Promise<Produto | null> {
  let encontrado = await prisma.produto.findUnique({ where: { slug } });

  if (!encontrado) {
    const idExterno = idExternoDeSlugMercadoLivre(slug);
    if (idExterno) {
      encontrado = await prisma.produto.findUnique({
        where: { plataforma_idExterno: { plataforma: Plataforma.MERCADO_LIVRE, idExterno } },
      });
    }
  }

  if (!encontrado) {
    const sufixo = /^(.*)-(\d+)$/.exec(slug);
    if (sufixo && Number(sufixo[2]) >= 2) {
      encontrado = await prisma.produto.findUnique({ where: { slug: sufixo[1] } });
    }
  }

  if (!encontrado) return null;

  const chave = chaveCanonicoProduto(encontrado.nome);
  const ancora = ancoraDaChave(chave);
  if (!chave || !ancora) return encontrado;

  const candidatos = await prisma.produto.findMany({
    where: {
      destino: encontrado.destino,
      OR: [{ slug: { contains: ancora } }, { nome: { contains: ancora, mode: "insensitive" } }],
    },
    orderBy: { criadoEm: "asc" },
  });
  const grupo = candidatos.filter((p) => chaveCanonicoProduto(p.nome) === chave);
  if (grupo.length === 0) return encontrado;
  return grupo.find((p) => !slugTemSufixoNumerico(p.slug)) ?? grupo[0]!;
}
