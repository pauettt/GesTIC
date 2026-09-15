import type { DeviceType } from "@prisma/client";

/** L'ordre en què es llisten els tipus, als formularis i als recomptes. */
export const DEVICE_TYPES = ["CHROMEBOOK", "PORTATIL", "IPAD", "TAULETA", "ALTRE"] as const satisfies readonly DeviceType[];

/** Com es diu un equip d'aquest tipus davant de la seva etiqueta: «iPad C1-04». */
export const deviceTypeLabels: Record<DeviceType, string> = {
  CHROMEBOOK: "Chromebook",
  PORTATIL: "Portàtil",
  IPAD: "iPad",
  TAULETA: "Tauleta",
  ALTRE: "Dispositiu",
};

/** Per comptar-los: les marques van en majúscula i la resta, no. */
const COUNT_WORDS: Record<DeviceType, [string, string]> = {
  CHROMEBOOK: ["Chromebook", "Chromebooks"],
  PORTATIL: ["portàtil", "portàtils"],
  IPAD: ["iPad", "iPads"],
  TAULETA: ["tauleta", "tauletes"],
  ALTRE: ["altre dispositiu", "altres dispositius"],
};

export function deviceCount(type: DeviceType, count: number) {
  const [one, many] = COUNT_WORDS[type];
  return `${count} ${count === 1 ? one : many}`;
}

/** Què porta un carro: «28 Chromebooks · 2 iPads». Buit si no porta res. */
export function deviceSummary(devices: { deviceType: DeviceType }[]) {
  const counts = new Map<DeviceType, number>();
  for (const device of devices) counts.set(device.deviceType, (counts.get(device.deviceType) ?? 0) + 1);
  return DEVICE_TYPES.filter((type) => counts.has(type))
    .map((type) => deviceCount(type, counts.get(type) ?? 0))
    .join(" · ");
}

/**
 * El tipus a partir del que diu un full de càlcul («iPad 9a gen.», «Portátil HP»,
 * «chromebook»). `null` si la cel·la és buida; si diu una altra cosa, és un altre
 * dispositiu, i no un Chromebook per defecte.
 */
export function parseDeviceType(text: string): DeviceType | null {
  const value = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  if (!value) return null;
  if (value.includes("chromebook")) return "CHROMEBOOK";
  if (value.includes("ipad")) return "IPAD";
  if (/portatil|laptop|notebook|macbook/.test(value)) return "PORTATIL";
  if (/tauleta|tableta|tablet/.test(value)) return "TAULETA";
  return "ALTRE";
}
