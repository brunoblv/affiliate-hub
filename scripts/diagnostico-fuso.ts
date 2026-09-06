import "dotenv/config";
import { prisma } from "@/lib/database";
import { FUSO_APP, formatarLocal, paraUtc, partesNoFuso } from "@/lib/agenda/fuso";
import { HORARIOS_PADRAO, JANELA_INICIO } from "@/lib/agenda/janela";
import { HORA_JORNADA } from "@/lib/agenda/meio-dia";

async function main() {
  const agora = new Date();
  const p = partesNoFuso(agora);
  const nove = paraUtc(p.ano, p.mes, p.dia, 9, 0);
  const doze = paraUtc(p.ano, p.mes, p.dia, 12, 0);

  console.log("--- processo ---");
  console.log({
    FUSO_APP,
    TZ_APP: process.env.TZ_APP ?? "(não definido)",
    TZ: process.env.TZ ?? "(não definido)",
    agoraUtc: agora.toISOString(),
    agoraBrasilia: formatarLocal(agora),
  });
  console.log("09:00 BRT ->", nove.toISOString(), "| tela", formatarLocal(nove));
  console.log("12:00 BRT ->", doze.toISOString(), "| tela", formatarLocal(doze));
  console.log("janela inicia", JANELA_INICIO, "primeiro slot", HORARIOS_PADRAO[0], "jornada", HORA_JORNADA);

  const pg = await prisma.$queryRaw<
    Array<{ tz: string; now: Date; now_utc: Date; tipo: string }>
  >`
    SELECT
      current_setting('TimeZone') AS tz,
      now() AS now,
      now() AT TIME ZONE 'UTC' AS now_utc,
      (
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'publicacoes' AND column_name = 'agendadaPara'
      ) AS tipo
  `;
  console.log("--- postgres ---");
  console.log(pg[0]);

  const amostras = await prisma.$queryRaw<
    Array<{
      agendadaPara: Date;
      status: string;
      hora_naive: number;
      hora_at_tz_sp: number;
      hora_utc_as_brt: number;
    }>
  >`
    SELECT
      "agendadaPara",
      status::text AS status,
      EXTRACT(HOUR FROM "agendadaPara")::int AS hora_naive,
      EXTRACT(HOUR FROM ("agendadaPara" AT TIME ZONE 'America/Sao_Paulo'))::int AS hora_at_tz_sp,
      EXTRACT(HOUR FROM (("agendadaPara" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'))::int AS hora_utc_as_brt
    FROM publicacoes
    WHERE status IN ('PENDENTE'::"StatusPublicacao", 'PUBLICADA'::"StatusPublicacao")
    ORDER BY "agendadaPara" DESC
    LIMIT 12
  `;

  console.log("--- amostras SQL (hora naive = o que está gravado no TIMESTAMP) ---");
  for (const row of amostras) {
    const d = new Date(row.agendadaPara);
    console.log({
      utc: d.toISOString(),
      tela: formatarLocal(d),
      horaNaive: row.hora_naive,
      horaSeInterpretarComoBrasilia: row.hora_at_tz_sp,
      horaSeUtcVirarBrasilia: row.hora_utc_as_brt,
      status: row.status,
    });
  }

  const fila = await prisma.publicacao.findMany({
    where: { status: { in: ["PENDENTE", "PUBLICANDO", "PUBLICADA"] } },
    orderBy: { agendadaPara: "asc" },
    take: 120,
    select: { agendadaPara: true, status: true, contentType: true, publicadaEm: true },
  });

  const primeiroDoDia = new Map<string, (typeof fila)[number]>();
  for (const pub of fila) {
    const partes = partesNoFuso(pub.agendadaPara);
    const chave = `${partes.ano}-${String(partes.mes).padStart(2, "0")}-${String(partes.dia).padStart(2, "0")}`;
    if (!primeiroDoDia.has(chave)) primeiroDoDia.set(chave, pub);
  }

  console.log("--- primeiro post de cada dia (pelo instante, convertido p/ Brasília) ---");
  for (const [dia, pub] of [...primeiroDoDia.entries()].slice(-10)) {
    console.log({
      dia,
      tela: formatarLocal(pub.agendadaPara),
      utc: pub.agendadaPara.toISOString(),
      horaUtc: pub.agendadaPara.getUTCHours(),
      status: pub.status,
      tipo: pub.contentType,
      publicadaEmUtc: pub.publicadaEm?.toISOString() ?? null,
      publicadaEmTela: pub.publicadaEm ? formatarLocal(pub.publicadaEm) : null,
    });
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
