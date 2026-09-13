/**
 * Formats de data que arriben dels formularis.
 *
 * Una acció de servidor es pot cridar amb qualsevol cosa, no només amb el que
 * envia el formulari. Sense aquestes comprovacions, una data mal formada
 * arribava fins a `zonedDateTime`, que llança en formatar-la, i qui l'havia
 * enviada es trobava un error genèric en comptes d'un missatge.
 */

/** "YYYY-MM-DD", i que el dia existeixi: un 31 de febrer no passa. */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Valor d'un `<input type="datetime-local">`: "YYYY-MM-DDTHH:mm". */
export function isDateTimeLocal(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  return isDateKey(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60;
}
