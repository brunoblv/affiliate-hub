import { prisma, Plataforma, type Prisma } from "@/lib/database";
import { registrar } from "@/lib/log";
import { getMercadoLivreTokens } from "./credentials";
import { buscarInfoCatalogo, buscarPrecoViaCatalogo } from "./client";

/** Pequena pausa entre produtos — sem rate limiter dedicado, mas evita rajada na API do ML. */
const PAUSA_ENTRE_PRODUTOS_MS = 300;

interface DadosBrutosComCatalogo {
  catalog_product_id?: string | null;
}

function extrairCatalogProductId(dadosBrutos: Prisma.JsonValue | null): string | null {
  if (!dadosBrutos || typeof dadosBrutos !== "object" || Array.isArray(dadosBrutos)) return null;
  const catalogProductId = (dadosBrutos as DadosBrutosComCatalogo).catalog_product_id;
  return typeof catalogProductId === "string" ? catalogProductId : null;
}

/**
 * Atualiza preço, nome e imagem dos produtos ativos do Mercado Livre via API
 * de Catálogo, gravando um snapshot em HistoricoPreco sempre que o preço
 * mudar. Chamada periodicamente pelo worker — ver workers/index.ts.
 */
export async function sincronizarPrecosMercadoLivre(): Promise<void> {
  const tokens = await getMercadoLivreTokens();
  if (!tokens) {
    await registrar("INFO", "PRODUTO_SYNC", "Mercado Livre não conectado, sincronização de preço pulada");
    return;
  }

  const produtos = await prisma.produto.findMany({
    where: { plataforma: Plataforma.MERCADO_LIVRE, ativo: true },
  });

  let atualizados = 0;
  let semMudanca = 0;
  let semCatalogo = 0;
  let comErro = 0;

  for (const produto of produtos) {
    try {
      const catalogProductId = extrairCatalogProductId(produto.dadosBrutos);
      if (!catalogProductId) {
        semCatalogo++;
        await registrar("INFO", "PRODUTO_SYNC", "Produto sem catalog_product_id, sync pulado", {
          produtoId: produto.id,
          idExterno: produto.idExterno,
        });
        continue;
      }

      const [precoFresco, infoFresca] = await Promise.all([
        buscarPrecoViaCatalogo(catalogProductId, produto.idExterno),
        buscarInfoCatalogo(catalogProductId),
      ]);

      if (!precoFresco) {
        await registrar("INFO", "PRODUTO_SYNC", "Anúncio não encontrado no catálogo (removido/pausado?)", {
          produtoId: produto.id,
          idExterno: produto.idExterno,
          catalogProductId,
        });
        continue;
      }

      const precoAtual = Number(produto.precoAtual);
      const precoOriginalAtual = produto.precoOriginal === null ? null : Number(produto.precoOriginal);
      const imagens = Array.isArray(produto.imagens) ? (produto.imagens as string[]) : [];

      const precoMudou = precoFresco.preco !== precoAtual || precoFresco.precoOriginal !== precoOriginalAtual;
      const nomeMudou = infoFresca.nome !== produto.nome;
      const novaImagemUrl = infoFresca.imagemUrl;
      const imagemMudou = Boolean(novaImagemUrl) && novaImagemUrl !== imagens[0];

      if (!precoMudou && !nomeMudou && !imagemMudou) {
        semMudanca++;
        await prisma.produto.update({ where: { id: produto.id }, data: { sincronizadoEm: new Date() } });
        continue;
      }

      const dados: Prisma.ProdutoUpdateInput = { sincronizadoEm: new Date() };
      if (precoMudou) {
        dados.precoAtual = precoFresco.preco;
        dados.precoOriginal = precoFresco.precoOriginal;
      }
      if (nomeMudou) dados.nome = infoFresca.nome;
      if (imagemMudou && novaImagemUrl) dados.imagens = [novaImagemUrl, ...imagens.slice(1)];

      await prisma.$transaction([
        prisma.produto.update({ where: { id: produto.id }, data: dados }),
        ...(precoMudou
          ? [prisma.historicoPreco.create({ data: { produtoId: produto.id, preco: precoFresco.preco } })]
          : []),
      ]);

      atualizados++;
    } catch (erro) {
      comErro++;
      await registrar("ERRO", "PRODUTO_SYNC", "Falha ao sincronizar preço do Mercado Livre", {
        produtoId: produto.id,
        idExterno: produto.idExterno,
        erro: erro instanceof Error ? erro.message : String(erro),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_PRODUTOS_MS));
  }

  await registrar("INFO", "PRODUTO_SYNC", "Mercado Livre: sincronização de preço concluída", {
    total: produtos.length,
    atualizados,
    semMudanca,
    semCatalogo,
    comErro,
  });
}
