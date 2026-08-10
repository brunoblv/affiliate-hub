/**
 * Detecta o separador do CSV pela primeira linha — o Excel em pt-BR salva com
 * ";" (já que "," é o separador decimal nesse locale), enquanto o padrão
 * internacional usa ",". Conta ocorrências fora de aspas na primeira linha.
 */
function detectDelimiter(firstLine: string): "," | ";" {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char === ",") commas++;
    else if (!inQuotes && char === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

/** Parser de CSV simples (RFC 4180): trata campos entre aspas, separador (auto-detectado) e quebras de linha entre aspas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(normalized.slice(0, normalized.indexOf("\n") + 1 || undefined));

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Converte linhas de objetos em texto CSV, escapando campos com vírgula/aspas/quebra de linha.
 * Inclui BOM UTF-8 no início — sem ele, o Excel no Windows abre o arquivo assumindo
 * ANSI/Windows-1252 e corrompe acentos (á, ç, ã, etc.).
 */
export function toCsv(headers: string[], rows: Array<Record<string, string>>): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return "﻿" + lines.join("\n");
}
