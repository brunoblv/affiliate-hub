import Link from "next/link";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { GerarArtigoWizard } from "@/components/admin/gerar-artigo-wizard";

export const maxDuration = 60;

export default async function GerarArtigoPage() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { slug: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerar artigo com IA"
        description="Escolha a categoria, deixe o Gemini sugerir um tema e escrever o artigo. Nada é salvo até você revisar e confirmar no editor abaixo."
      />
      <GerarArtigoWizard produtos={produtos} />
      <Link href="/admin/posts/gerar-lista" className="block text-sm text-muted-foreground hover:underline">
        Prefere uma lista de produtos por cômodo? Gerar com o Gemini
      </Link>
    </div>
  );
}
