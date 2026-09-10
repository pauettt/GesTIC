/**
 * Un préstec està fora de termini quan la data prevista de retorn ja ha passat
 * i encara no s'ha marcat com a retornat. `endDate` es desa a les 23:59 del dia
 * del retorn, així que el mateix dia del venciment encara no compta com a tard.
 */
export function isOverdue(endDate: Date, now: Date = new Date()) {
  return endDate < now;
}

export function daysOverdue(endDate: Date, now: Date = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - endDate.getTime()) / 86_400_000));
}
