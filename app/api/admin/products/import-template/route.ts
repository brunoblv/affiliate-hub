import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

const HEADERS = [
  "nome",
  "projeto",
  "plataforma",
  "id_anuncio",
  "categoria",
  "marca",
  "descricao",
  "preco",
  "preco_original",
  "comissao_percent",
  "avaliacao",
  "num_avaliacoes",
  "vendidos",
  "url_imagem",
  "url_produto",
];

const EXAMPLE_ROWS = [
  {
    nome: "Jogo de Panelas Antiaderente 5 Peças",
    projeto: "meu-novo-lar",
    plataforma: "MERCADO_LIVRE",
    id_anuncio: "MLB1234567890",
    categoria: "Cozinha",
    marca: "Tramontina",
    descricao: "Jogo de panelas antiaderentes com cabo baquelite.",
    preco: "199.90",
    preco_original: "289.90",
    comissao_percent: "5",
    avaliacao: "4.7",
    num_avaliacoes: "312",
    vendidos: "1500",
    url_imagem: "https://http2.mlstatic.com/exemplo.jpg",
    url_produto: "https://produto.mercadolivre.com.br/MLB-1234567890",
  },
  {
    nome: "Aspirador de Pó Vertical 2 em 1",
    projeto: "meu-novo-lar",
    plataforma: "AMAZON",
    id_anuncio: "B0EXEMPLO123",
    categoria: "Eletroportáteis",
    marca: "Electrolux",
    descricao: "Aspirador vertical sem fio, bateria removível.",
    preco: "349.00",
    preco_original: "429.00",
    comissao_percent: "4",
    avaliacao: "4.5",
    num_avaliacoes: "890",
    vendidos: "",
    url_imagem: "https://m.media-amazon.com/exemplo.jpg",
    url_produto: "https://www.amazon.com.br/dp/B0EXEMPLO123",
  },
  {
    nome: "Organizador de Gaveta 8 Peças",
    projeto: "meu-novo-lar",
    plataforma: "SHOPEE",
    id_anuncio: "",
    categoria: "Organização",
    marca: "",
    descricao: "Kit de organizadores plásticos para gavetas.",
    preco: "39.90",
    preco_original: "",
    comissao_percent: "10",
    avaliacao: "4.8",
    num_avaliacoes: "2100",
    vendidos: "5000",
    url_imagem: "https://cf.shopee.com.br/exemplo.jpg",
    url_produto: "https://shopee.com.br/exemplo-produto",
  },
];

/**
 * Template CSV de importação em massa (docs: mesmas colunas usadas por
 * importProductsAction em app/admin/(dashboard)/products/import/actions.ts).
 * Serve para qualquer plataforma manual (Mercado Livre, Amazon, Shopee, etc.)
 * — a coluna "plataforma" aceita qualquer valor do enum Platform.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const csv = toCsv(HEADERS, EXAMPLE_ROWS);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="produtos-template.csv"',
    },
  });
}
