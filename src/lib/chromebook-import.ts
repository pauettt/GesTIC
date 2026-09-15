import { spaceName } from "@/lib/spaces";

/**
 * Importació de carros i Chromebooks des d'un full de càlcul exportat en CSV.
 * No hi ha res escrit per a un full concret: les columnes es reconeixen pel
 * títol i, si no, s'assignen a mà a la vista prèvia. La mateixa funció fa la
 * vista prèvia al navegador i la importació al servidor, que no es refia del
 * que li arriba i ho torna a calcular amb les dades d'aquell moment.
 */

export const CHROMEBOOK_FIELDS = [
  "cart",
  "position",
  "assetTag",
  "serialNumber",
  "brand",
  "model",
  "roomNumber",
  "roomName",
] as const;
export type ChromebookField = (typeof CHROMEBOOK_FIELDS)[number];

/** Per a cada dada, l'índex de la columna del full on és. */
export type ColumnMapping = Partial<Record<ChromebookField, number>>;

export const CHROMEBOOK_FIELD_LABELS: Record<ChromebookField, string> = {
  cart: "Carro",
  position: "Número dins del carro",
  assetTag: "Etiqueta",
  serialNumber: "Número de sèrie",
  brand: "Marca",
  model: "Model",
  roomNumber: "Número d'aula",
  roomName: "Nom de l'aula",
};

/** Títols habituals de cada columna, ja normalitzats (vegeu `normalizeHeader`). */
const ALIASES: Record<ChromebookField, string[]> = {
  cart: ["carro", "carreto", "n carro", "n carreto", "num carro", "numero carro", "carrito", "n carrito"],
  position: ["f", "n", "num", "numero", "posicio", "posicion", "n dins del carro", "numero dins del carro"],
  assetTag: ["etiqueta", "identificador", "codi", "codigo", "asset tag"],
  serialNumber: ["ns", "n s", "sn", "s n", "serie", "n serie", "num serie", "numero de serie", "serial", "serial number"],
  brand: ["marca", "fabricant", "fabricante"],
  model: ["model", "modelo"],
  roomNumber: ["aula", "n aula", "num aula", "numero aula", "numero d aula", "numero de aula"],
  roomName: ["nom aula", "nom d aula", "nom de l aula", "nombre aula", "nombre del aula"],
};

/** «nº Carretó» → «n carreto»: sense accents, majúscules ni signes. */
export function normalizeHeader(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** La fila de títols i les columnes que s'hi reconeixen. Mira les primeres files: hi pot haver un títol a sobre. */
export function detectColumns(rows: string[][]): { headerRow: number; mapping: ColumnMapping } {
  let best = { headerRow: 0, mapping: {} as ColumnMapping, found: 0 };
  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    const headers = rows[index].map(normalizeHeader);
    const mapping: ColumnMapping = {};
    const used = new Set<number>();
    for (const field of CHROMEBOOK_FIELDS) {
      const column = headers.findIndex((header, position) => !used.has(position) && ALIASES[field].includes(header));
      if (column !== -1) {
        mapping[field] = column;
        used.add(column);
      }
    }
    const found = Object.keys(mapping).length;
    if (found > best.found) best = { headerRow: index, mapping, found };
  }
  return { headerRow: best.headerRow, mapping: best.mapping };
}

/** Què es fa amb els equips que al full no són de cap carro. */
export type RowsWithoutCart = "pool" | "skip";

export type ExistingInventory = {
  spaces: { name: string; number: string | null }[];
  cartNames: string[];
  assetTags: string[];
  serialNumbers: string[];
};

export type PlannedSpace = { name: string; number: string | null; roomName: string | null };
export type PlannedCart = { name: string; spaceName: string | null; chromebooks: number; exists: boolean };
export type PlannedChromebook = {
  row: number;
  assetTag: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  /** `null`: va al pool de préstec a l'alumnat. */
  cartName: string | null;
};
export type ImportIssue = { row: number; message: string };

export type ChromebookImportPlan = {
  newSpaces: PlannedSpace[];
  carts: PlannedCart[];
  chromebooks: PlannedChromebook[];
  /** Ja són a gesTIC: no es tornen a crear. */
  duplicates: ImportIssue[];
  /** No es poden importar tal com són. */
  errors: ImportIssue[];
  withoutCart: number;
};

const POOL_PREFIX = "ALU-";

const lower = (text: string) => text.trim().toLowerCase();
const pad = (value: number) => String(value).padStart(2, "0");
const isWholeNumber = (text: string) => /^\d+$/.test(text);

export function planChromebookImport(
  rows: string[][],
  options: { headerRow: number; mapping: ColumnMapping; withoutCart: RowsWithoutCart },
  existing: ExistingInventory,
): ChromebookImportPlan {
  const { headerRow, mapping } = options;
  const cell = (values: string[], field: ChromebookField) => {
    const column = mapping[field];
    return column === undefined ? "" : (values[column] ?? "").trim();
  };

  const spaceByNumber = new Map(
    existing.spaces.filter((space) => space.number).map((space) => [lower(space.number ?? ""), space.name]),
  );
  const spaceByName = new Map(existing.spaces.map((space) => [lower(space.name), space.name]));
  const existingCarts = new Map(existing.cartNames.map((name) => [lower(name), name]));
  const takenTags = new Set(existing.assetTags.map(lower));
  const takenSerials = new Set(existing.serialNumbers.map(lower));

  const newSpaces = new Map<string, PlannedSpace>();
  function resolveSpace(number: string, roomName: string): string | null {
    if (!number && !roomName) return null;
    const name = spaceName({ number, roomName });
    const known = (number && spaceByNumber.get(lower(number))) || spaceByName.get(lower(name));
    if (known) return known;
    // Una aula nova es reconeix pel número si en té: dues files amb el mateix número són la mateixa aula.
    const planKey = number ? `#${lower(number)}` : lower(name);
    const planned = newSpaces.get(planKey);
    if (planned) return planned.name;
    newSpaces.set(planKey, { name, number: number || null, roomName: roomName || null });
    return name;
  }

  type Row = {
    row: number;
    cart: string;
    position: string;
    assetTag: string;
    serialNumber: string;
    brand: string;
    model: string;
    space: string | null;
    spaceShort: string | null;
  };
  const parsed: Row[] = [];
  rows.slice(headerRow + 1).forEach((values, offset) => {
    if (CHROMEBOOK_FIELDS.every((field) => cell(values, field) === "")) return;
    const number = cell(values, "roomNumber");
    const roomName = cell(values, "roomName");
    parsed.push({
      // Tal com surt al full de càlcul: la primera fila és l'1.
      row: headerRow + offset + 2,
      // «Conselleria,» és el mateix carro que «Conselleria»: una coma de més al full no n'ha de crear un altre.
      cart: cell(values, "cart").replace(/[\s,;.:]+$/u, ""),
      position: cell(values, "position"),
      assetTag: cell(values, "assetTag"),
      serialNumber: cell(values, "serialNumber"),
      brand: cell(values, "brand"),
      model: cell(values, "model"),
      space: resolveSpace(number, roomName),
      spaceShort: number || roomName || null,
    });
  });

  // Cada carro, amb l'aula on hi ha més equips seus: «Carro 1 (A.002)».
  const cartGroups = new Map<string, Row[]>();
  for (const item of parsed) {
    if (!item.cart) continue;
    const groupKey = isWholeNumber(item.cart) ? String(Number(item.cart)) : lower(item.cart);
    cartGroups.set(groupKey, [...(cartGroups.get(groupKey) ?? []), item]);
  }
  const cartNameByGroup = new Map<string, { name: string; spaceName: string | null; tagPart: string }>();
  for (const [groupKey, items] of cartGroups) {
    const tally = new Map<string, { space: string; short: string; count: number }>();
    for (const item of items) {
      if (!item.space || !item.spaceShort) continue;
      const entry = tally.get(item.space) ?? { space: item.space, short: item.spaceShort, count: 0 };
      entry.count += 1;
      tally.set(item.space, entry);
    }
    const main = [...tally.values()].sort((a, b) => b.count - a.count)[0];
    const first = items[0].cart;
    const base = isWholeNumber(first) ? `Carro ${Number(first)}` : first;
    const name = main ? `${base} (${main.short})` : base;
    cartNameByGroup.set(groupKey, {
      name: existingCarts.get(lower(name)) ?? existingCarts.get(lower(base)) ?? name,
      spaceName: main?.space ?? null,
      tagPart: isWholeNumber(first) ? String(Number(first)) : first.replace(/\s+/g, "").toUpperCase(),
    });
  }

  let nextPoolNumber =
    existing.assetTags.reduce((max, tag) => {
      const match = new RegExp(`^${POOL_PREFIX}(\\d+)$`, "i").exec(tag.trim());
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  const chromebooks: PlannedChromebook[] = [];
  const duplicates: ImportIssue[] = [];
  const errors: ImportIssue[] = [];
  const sheetTags = new Map<string, number>();
  const sheetSerials = new Map<string, number>();
  const positionInCart = new Map<string, number>();
  const createdPerCart = new Map<string, number>();
  let withoutCart = 0;

  for (const item of parsed) {
    let assetTag = item.assetTag;
    let cartName: string | null = null;

    if (item.cart) {
      const groupKey = isWholeNumber(item.cart) ? String(Number(item.cart)) : lower(item.cart);
      const cart = cartNameByGroup.get(groupKey);
      if (!cart) continue;
      cartName = cart.name;
      const index = (positionInCart.get(groupKey) ?? 0) + 1;
      positionInCart.set(groupKey, index);
      if (!assetTag) {
        if (item.position && !isWholeNumber(item.position)) {
          errors.push({ row: item.row, message: `El número dins del carro («${item.position}») no és un número` });
          continue;
        }
        assetTag = `C${cart.tagPart}-${pad(item.position ? Number(item.position) : index)}`;
      }
    } else {
      withoutCart += 1;
      if (options.withoutCart === "skip") continue;
      // Un equip que surt del centre amb una família s'identifica pel número de sèrie.
      if (!item.serialNumber) {
        errors.push({ row: item.row, message: "Sense carro ni número de sèrie: no pot anar al préstec a l'alumnat" });
        continue;
      }
      if (!assetTag) {
        assetTag = `${POOL_PREFIX}${pad(nextPoolNumber)}`;
        nextPoolNumber += 1;
      }
    }

    if (takenTags.has(lower(assetTag))) {
      duplicates.push({ row: item.row, message: `Ja hi ha un Chromebook amb l'etiqueta ${assetTag}` });
      continue;
    }
    if (item.serialNumber && takenSerials.has(lower(item.serialNumber))) {
      duplicates.push({ row: item.row, message: `Ja hi ha un Chromebook amb el número de sèrie ${item.serialNumber}` });
      continue;
    }
    const repeatedTag = sheetTags.get(lower(assetTag));
    if (repeatedTag) {
      errors.push({ row: item.row, message: `L'etiqueta ${assetTag} ja surt a la fila ${repeatedTag}` });
      continue;
    }
    const repeatedSerial = item.serialNumber ? sheetSerials.get(lower(item.serialNumber)) : undefined;
    if (repeatedSerial) {
      errors.push({ row: item.row, message: `El número de sèrie ${item.serialNumber} ja surt a la fila ${repeatedSerial}` });
      continue;
    }

    sheetTags.set(lower(assetTag), item.row);
    if (item.serialNumber) sheetSerials.set(lower(item.serialNumber), item.row);
    if (cartName) createdPerCart.set(cartName, (createdPerCart.get(cartName) ?? 0) + 1);
    chromebooks.push({
      row: item.row,
      assetTag,
      serialNumber: item.serialNumber || null,
      brand: item.brand || null,
      model: item.model || null,
      cartName,
    });
  }

  const carts: PlannedCart[] = [...cartNameByGroup.values()].map((cart) => ({
    name: cart.name,
    spaceName: cart.spaceName,
    chromebooks: createdPerCart.get(cart.name) ?? 0,
    exists: existingCarts.has(lower(cart.name)),
  }));

  // Només les aules que fan falta de debò: les dels carros nous que tindran equips.
  const usedSpaces = new Set(
    carts.filter((cart) => !cart.exists && cart.chromebooks > 0).map((cart) => cart.spaceName),
  );
  return {
    newSpaces: [...newSpaces.values()].filter((space) => usedSpaces.has(space.name)),
    carts,
    chromebooks,
    duplicates,
    errors,
    withoutCart,
  };
}
