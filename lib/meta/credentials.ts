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
  paginas: PaginaMeta[];
}

const PROVEDOR = "meta";
const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

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

interface RespostaContas {
  data?: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
  error?: { message: string };
}

/** Busca as Páginas do Facebook (+ Instagram vinculado) a partir do META_USER_TOKEN do .env. */
export async function sincronizarPaginasMeta(): Promise<PaginaMeta[]> {
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) throw new Error("META_USER_TOKEN não configurado.");

  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  url.searchParams.set("access_token", userToken);

  const resposta = await fetch(url);
  const json = (await resposta.json()) as RespostaContas;

  if (!resposta.ok) {
    throw new Error(`Meta: falha ao listar páginas — ${json.error?.message ?? resposta.statusText}`);
  }

  const paginas: PaginaMeta[] = (json.data ?? []).map((p) => ({
    id: p.id,
    nome: p.name,
    accessToken: p.access_token,
    instagramBusinessAccountId: p.instagram_business_account?.id,
  }));

  await salvarCredenciais({ userAccessToken: userToken, paginas });
  return paginas;
}

export async function obterTokenDePagina(pageId: string): Promise<string> {
  const credenciais = await obterCredenciais();
  let pagina = credenciais?.paginas.find((p) => p.id === pageId);

  if (!pagina && process.env.META_USER_TOKEN) {
    const paginas = await sincronizarPaginasMeta();
    pagina = paginas.find((p) => p.id === pageId);
  }

  if (!pagina) {
    throw new Error(`Página ${pageId} sem token — defina META_USER_TOKEN no .env (admin da página).`);
  }

  return pagina.accessToken;
}

export async function obterTokenPorContaInstagram(igUserId: string): Promise<string> {
  const credenciais = await obterCredenciais();
  let pagina = credenciais?.paginas.find((p) => p.instagramBusinessAccountId === igUserId);

  if (!pagina && process.env.META_USER_TOKEN) {
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
