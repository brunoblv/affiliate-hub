import sharp from "sharp";
import { prisma } from "@/lib/database";
import { produtosReferenciados } from "@/lib/conteudo/corpo";
import { editarImagemOpenAi, gerarImagemOpenAi, openaiImagensDisponivel } from "@/lib/conteudo/openai-imagens";
import { registrar } from "@/lib/log";
import { primeiraImagem, slugify } from "@/lib/produtos";
import { comporArte, comporCapaComCena, type ArteComposta } from "./compor";
import { resolverBufferDeImagem } from "./foto";
import { escolherVariante, type TipoArte } from "./layouts";
import { salvarArteComoCapa } from "./salvar";
import { inferirTemaVisual, moodDoFundo, promptDaCena } from "./tema-visual";

const MAX_FOTOS_PRODUTO = 5;

export interface EntradaCapaIa {
  tipo: TipoArte;
  titulo: string;
  resumo?: string | null;
  corpo?: string | null;
  /** Slugs já resolvidos; se vazio, lê os [produto:slug] do corpo. */
  slugsProduto?: string[];
  /** Cômodo/pauta (ex.: "cozinha") — desempata o tema visual. */
  dicaTema?: string | null;
  /**
   * Se a OpenAI falhar (ou a chave não existir), cai na composição local
   * fundo+foto. O botão do admin deixa isso desligado pra o erro aparecer.
   */
  fallbackComposicao?: boolean;
}

export interface MidiaCapaGerada {
  id: string;
  url: string;
  alt: string | null;
}

export interface FotoDeProduto {
  arquivo: string;
  rotulo: string;
  url: string;
  buffer: Buffer;
}

/** Busca e redimensiona as fotos de referência de 1+ produtos (por slug). */
export async function fotosDosProdutos(slugs: string[]): Promise<FotoDeProduto[]> {
  if (slugs.length === 0) return [];
  const produtos = await prisma.produto.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, nome: true, imagens: true },
  });
  const porSlug = new Map(produtos.map((p) => [p.slug, p]));
  const fotos: { arquivo: string; rotulo: string; url: string; buffer: Buffer }[] = [];

  for (const slug of slugs.slice(0, MAX_FOTOS_PRODUTO)) {
    const produto = porSlug.get(slug);
    if (!produto) continue;
    const url = primeiraImagem({ imagens: produto.imagens as never });
    if (!url) continue;
    try {
      const original = await resolverBufferDeImagem(url);
      const buffer = await sharp(original)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      fotos.push({
        arquivo: `${slugify(produto.nome).slice(0, 40) || slug}.jpg`,
        rotulo: produto.nome,
        url,
        buffer,
      });
    } catch {
      // CDN da loja fora do ar — segue com os que deram certo.
    }
  }

  return fotos;
}

async function composicaoLocal(entrada: EntradaCapaIa, semente: string, fotoUrl: string | null): Promise<ArteComposta | null> {
  return comporArte({
    tipo: entrada.tipo,
    formato: "capa",
    semente,
    titulo: entrada.titulo,
    fotoUrl,
  });
}

/**
 * Gera a cena com a Images API da OpenAI (montagem dos produtos no tema do
 * post) e cola no fundo de public/fundos-posts/capa/. Sem OpenAI, ou se
 * `fallbackComposicao`, cai no pipeline antigo (fundo + foto).
 */
export async function gerarCapaComIa(entrada: EntradaCapaIa): Promise<ArteComposta> {
  const semente = `${entrada.tipo}:${entrada.titulo}:${Date.now()}`;
  const slugs = entrada.slugsProduto?.length
    ? entrada.slugsProduto
    : produtosReferenciados(entrada.corpo ?? "");
  const fotos = await fotosDosProdutos(slugs);
  const fotoFallback = fotos[0]?.url ?? null;

  if (!openaiImagensDisponivel()) {
    if (!entrada.fallbackComposicao) {
      throw new Error("OPENAI_API_KEY não configurado no .env.");
    }
    const local = await composicaoLocal(entrada, semente, fotoFallback);
    if (!local) throw new Error(`Ainda não há fundo cadastrado em public/fundos-posts/capa/${entrada.tipo}/.`);
    return local;
  }

  const layout = escolherVariante(entrada.tipo, semente, "capa");
  const tema = inferirTemaVisual({
    titulo: entrada.titulo,
    resumo: entrada.resumo,
    dica: entrada.dicaTema,
  });
  const prompt = promptDaCena({
    tipo: entrada.tipo,
    titulo: entrada.titulo,
    tema,
    mood: moodDoFundo(entrada.tipo, layout.arquivo),
    produtos: fotos.map((foto) => foto.rotulo),
  });

  try {
    const cena =
      fotos.length > 0
        ? await editarImagemOpenAi(
            prompt,
            fotos.map((foto) => ({ nome: foto.arquivo, buffer: foto.buffer, mime: "image/jpeg" as const })),
          )
        : await gerarImagemOpenAi(prompt);

    const arte = await comporCapaComCena({ tipo: entrada.tipo, semente, cena });
    if (!arte) throw new Error(`Ainda não há fundo cadastrado em public/fundos-posts/capa/${entrada.tipo}/.`);
    return arte;
  } catch (erro) {
    await registrar("ERRO", "ARTES", "Falha ao gerar capa com a OpenAI.", {
      tipo: entrada.tipo,
      titulo: entrada.titulo,
      tema: tema.id,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    if (!entrada.fallbackComposicao) throw erro;
    const local = await composicaoLocal(entrada, semente, fotoFallback);
    if (!local) throw erro;
    return local;
  }
}

/** Gera, salva como Midia e devolve o registro pronto pra gravar em Post.capaId. */
export async function gerarESalvarCapaDoPost(entrada: EntradaCapaIa): Promise<MidiaCapaGerada> {
  const arte = await gerarCapaComIa(entrada);
  const midia = await salvarArteComoCapa(arte.buffer, {
    nomeBase: slugify(entrada.titulo).slice(0, 60) || "capa",
    alt: entrada.titulo,
  });
  return { id: midia.id, url: midia.url, alt: midia.alt };
}
