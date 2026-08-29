export const metadata = { title: "Equipe Editorial — Meu Novo Lar" };

export default function EquipePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-10">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Equipe Editorial Meu Novo Lar</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Os artigos e recomendações do Meu Novo Lar são produzidos e revisados pela nossa equipe editorial antes
        de publicar. Todo conteúdo passa por uma checagem de precisão e de segurança antes de ir ao ar — em
        especial os textos sobre limpeza e produtos químicos.
      </p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-foreground">Como trabalhamos</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li>Cada artigo é escrito com foco em uso prático — sem inventar teste ou experiência que não foi feita.</li>
        <li>Recomendações de produto seguem os critérios explicados na nossa página{" "}
          <a href="/sobre" className="font-semibold text-primary hover:underline">Sobre</a>.
        </li>
        <li>Erros relatados por leitores são corrigidos assim que confirmados.</li>
        <li>Datas de publicação e atualização de cada artigo ficam sempre visíveis no topo do texto.</li>
      </ul>

      <p className="mt-10 text-[15px] leading-relaxed text-muted-foreground">
        Encontrou um erro ou quer sugerir um tema? Fale com a gente pela nossa{" "}
        <a href="/contato" className="font-semibold text-primary hover:underline">página de contato</a>.
      </p>
    </div>
  );
}
