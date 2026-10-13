// src/domain/sales-control/parse-tsv.ts
// Convierte el texto que Excel deja en el portapapeles (columnas con tabulador, filas con salto de línea)
// en una matriz de celdas. Respeta las celdas entre comillas, que pueden traer saltos de línea.

export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === "\t") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // POR QUÉ: Excel termina el portapapeles con un salto de línea; las filas vacías del final no son datos.
  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((value) => value.trim() === "")
  )
    rows.pop();
  return rows.map((cells) => cells.map((value) => value.trim()));
}
