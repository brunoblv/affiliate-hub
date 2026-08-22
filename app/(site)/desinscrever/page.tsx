import { prisma } from "@/lib/database";

export const metadata = { title: "Cancelar inscrição — Meu Novo Lar" };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  let unsubscribed = false;
  if (token) {
    const assinante = await prisma.assinante.findUnique({ where: { tokenBaixa: token } });
    if (assinante) {
      await prisma.assinante.update({
        where: { id: assinante.id },
        data: { ativo: false, baixaEm: new Date() },
      });
      unsubscribed = true;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-3xl font-semibold text-foreground">
        {unsubscribed ? "Inscrição cancelada" : "Link inválido"}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        {unsubscribed
          ? "Você não vai mais receber nossos e-mails de newsletter. Se mudar de ideia, é só se inscrever de novo na home."
          : "Esse link de descadastro não é válido ou já foi usado."}
      </p>
    </div>
  );
}
