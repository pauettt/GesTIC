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
