import { editarImagemOpenAi, gerarImagemOpenAi } from "@/lib/conteudo/openai-imagens";
import { fotosDosProdutos } from "./gerar-capa-ia";
import { inferirTemaVisual, moodDoFundo, promptDaCena } from "./tema-visual";

export interface HeroDeProdutoGerado {
  buffer: Buffer;
  prompt: string;
}

/**
 * Gera UMA imagem de ambiente para UM produto (não uma montagem de vários),
 * usando a(s) foto(s) reais do produto como referência de fidelidade. Ao
 * contrário da capa do post, não passa por `comporCapaComCena` — o resultado
 * é a cena fotográfica crua, sem moldura/marca do site, pronta pra uso em
 * Pinterest.
 */
export async function gerarHeroDeProduto(
  produto: { slug: string; nome: string },
  anguloDoArtigo: string,
): Promise<HeroDeProdutoGerado> {
  const fotos = await fotosDosProdutos([produto.slug]);
  const tema = inferirTemaVisual({ titulo: produto.nome, resumo: anguloDoArtigo });
  const prompt = promptDaCena({
    tipo: "produto",
    titulo: produto.nome,
    tema,
    mood: moodDoFundo("produto", "1.png"),
    produtos: fotos.length > 0 ? [fotos[0]!.rotulo] : [],
  });

  const buffer =
    fotos.length > 0
      ? await editarImagemOpenAi(prompt, [{ nome: fotos[0]!.arquivo, buffer: fotos[0]!.buffer, mime: "image/jpeg" }])
      : await gerarImagemOpenAi(prompt);

  return { buffer, prompt };
}
