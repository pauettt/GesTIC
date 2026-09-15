function escapeCsvCell(value: string): string {
  // Excel i Google Sheets executen com a fórmula qualsevol cel·la que comenci
  // per aquests caràcters, així que un nom d'equip com "=HYPERLINK(...)" podria
  // arribar a exfiltrar dades en obrir l'exportació. L'apòstrof la neutralitza.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/**
 * Llegeix un CSV com el que baixen Google Sheets o Excel: cel·les entre cometes
 * amb comes, salts de línia i cometes doblades a dins, finals de línia de
 * Windows i la marca BOM del principi. L'Excel en castellà o català separa amb
 * punt i coma; es detecta a la primera línia. Tot surt com a text, sense tocar.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = input.slice(0, input.search(/\r?\n|$/));
  const separator = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
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
  return rows;
}
