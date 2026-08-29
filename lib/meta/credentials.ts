import { prisma } from "@/lib/database";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";

export interface PaginaMeta {
  id: string;
  nome: string;
  accessToken: string;
  instagramBusinessAccountId?: string;
}

interface CredenciaisMeta {
  userAccessToken?: string;
  userTokenExpireAt?: number;
  paginas: PaginaMeta[];
}

export interface ErroGraphMeta {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
}

const PROVEDOR = "meta";
const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const MSG_SESSAO_INVALIDA =
  "A sessão do Facebook foi invalidada (senha alterada ou segurança da Meta). Vá em Integrações e clique em Reconectar.";

export function mensagemErroMeta(erro: ErroGraphMeta | undefined, fallback: string): string {
  if (erro?.code === 190) return MSG_SESSAO_INVALIDA;
  return erro?.message ?? fallback;
}

async function obterCredenciais(): Promise<CredenciaisMeta | null> {
  const registro = await prisma.credencial.findUnique({ where: { provedor: PROVEDOR } });
  if (!registro?.ativo) return null;
  return decryptJson<CredenciaisMeta>(registro.payload);
}

async function salvarCredenciais(dados: CredenciaisMeta): Promise<void> {
  const payload = encryptJson(dados);
  await prisma.credencial.upsert({
    where: { provedor: PROVEDOR },
    create: { provedor: PROVEDOR, payload },
    update: { payload, ativo: true },
  });
}

/** Token de usuário: o salvo no banco (OAuth) tem prioridade sobre o META_USER_TOKEN do .env. */
export async function obterTokenDeUsuario(): Promise<string> {
  const credenciais = await obterCredenciais();
  const token = credenciais?.userAccessToken || process.env.META_USER_TOKEN;
  if (!token) {
    throw new Error("Meta não conectada — vá em Integrações e clique em Reconectar.");
  }
  return token;
}

interface RespostaContas {
  data?: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
  error?: ErroGraphMeta;
}

/** Busca as Páginas do Facebook (+ Instagram vinculado) a partir do token de usuário. */
export async function sincronizarPaginasMeta(
  userToken?: string,
  expiresInSegundos?: number,
): Promise<PaginaMeta[]> {
  const token = userToken ?? (await obterTokenDeUsuario());

  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  url.searchParams.set("access_token", token);

  const resposta = await fetch(url);
  const json = (await resposta.json()) as RespostaContas;

  if (!resposta.ok || json.error) {
    throw new Error(`Meta: falha ao listar páginas — ${mensagemErroMeta(json.error, resposta.statusText)}`);
  }

  const paginas: PaginaMeta[] = (json.data ?? []).map((p) => ({
    id: p.id,
    nome: p.name,
    accessToken: p.access_token,
    instagramBusinessAccountId: p.instagram_business_account?.id,
  }));

  const anteriores = userToken ? null : await obterCredenciais();
  await salvarCredenciais({
    userAccessToken: token,
    userTokenExpireAt:
      expiresInSegundos !== undefined
        ? Date.now() + expiresInSegundos * 1000
        : anteriores?.userTokenExpireAt,
    paginas,
  });
  return paginas;
}

export async function obterTokenDePagina(pageId: string): Promise<string> {
  const credenciais = await obterCredenciais();
  let pagina = credenciais?.paginas.find((p) => p.id === pageId);

  if (!pagina) {
    const paginas = await sincronizarPaginasMeta();
    pagina = paginas.find((p) => p.id === pageId);
  }

  if (!pagina) {
    throw new Error(`Página ${pageId} sem token — reconecte a Meta em Integrações.`);
  }

  return pagina.accessToken;
}

export async function obterTokenPorContaInstagram(igUserId: string): Promise<string> {
  const credenciais = await obterCredenciais();
  let pagina = credenciais?.paginas.find((p) => p.instagramBusinessAccountId === igUserId);

  if (!pagina) {
    const paginas = await sincronizarPaginasMeta();
    pagina = paginas.find((p) => p.instagramBusinessAccountId === igUserId);
  }

  if (!pagina) {
    throw new Error(`Conta Instagram ${igUserId} não encontrada entre as Páginas conectadas.`);
  }

  return pagina.accessToken;
}

export async function listarPaginasMeta(): Promise<PaginaMeta[]> {
  const credenciais = await obterCredenciais();
  return credenciais?.paginas ?? [];
}
