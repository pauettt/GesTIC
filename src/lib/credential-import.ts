/**
 * Lectura del full de contrasenyes exportat de Google Sheets (Fitxer → Baixa →
 * CSV), ja separat en files. El full té una fila de títols («Usuari»,
 * «Contrasenya», «Observacions») i franges amb una sola cel·la escrita
 * («COMPTES», «IMPRESSORES»…) que fan de categoria de les files de sota.
 */

export type ImportedCredential = {
  category: string;
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export type CredentialSheet =
  | { ok: true; credentials: ImportedCredential[]; skipped: number }
  | { ok: false; error: string };

const UNCATEGORIZED = "Sense categoria";

const HEADERS = {
  name: ["nom", "nombre", "servei", "servicio", "compte", "cuenta", "dispositiu"],
  username: ["usuari", "usuario", "user", "login"],
  password: ["contrasenya", "contrasena", "password", "clau", "clave"],
  url: ["enllac", "enlace", "url", "web", "adreca", "direccion"],
  notes: ["observacions", "observaciones", "notes", "notas", "comentaris"],
} as const;

type Column = keyof typeof HEADERS;

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

/** «COMPTES» → «Comptes». Els noms que ja porten minúscules es respecten. */
function categoryName(text: string) {
  const trimmed = text.trim();
  return trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()
    ? trimmed.charAt(0) + trimmed.slice(1).toLowerCase()
    : trimmed;
}

export function parseCredentialSheet(rows: string[][]): CredentialSheet {
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => (HEADERS.password as readonly string[]).includes(normalize(cell))),
  );
  if (headerIndex === -1) {
    return { ok: false, error: "No s'ha trobat la fila de títols: hi ha d'haver una columna «Contrasenya»." };
  }

  const header = rows[headerIndex].map(normalize);
  const columns = {} as Record<Column, number>;
  for (const column of Object.keys(HEADERS) as Column[]) {
    columns[column] = header.findIndex((cell) => (HEADERS[column] as readonly string[]).includes(cell));
  }
  // La columna del nom sol no tenir títol: és la primera que no és cap de les altres.
  if (columns.name === -1) {
    const taken = new Set(Object.values(columns));
    columns.name = header.findIndex((_, index) => !taken.has(index));
  }

  const cell = (row: string[], column: Column) => (columns[column] === -1 ? "" : (row[columns[column]] ?? ""));

  const credentials: ImportedCredential[] = [];
  let category = UNCATEGORIZED;
  let skipped = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const filled = row.filter((value) => value.trim() !== "");
    if (filled.length === 0) continue;
    if (filled.length === 1) {
      category = categoryName(filled[0]);
      continue;
    }

    const name = cell(row, "name").trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    credentials.push({
      category,
      name,
      username: cell(row, "username").trim(),
      // La contrasenya no es retalla: un espai al principi o al final pot ser-ne part.
      password: cell(row, "password"),
      url: cell(row, "url").trim(),
      notes: cell(row, "notes").trim(),
    });
  }

  return { ok: true, credentials, skipped };
}
