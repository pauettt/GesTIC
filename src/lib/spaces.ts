/**
 * Com es mostra un espai a tot arreu: el número oficial davant, que és el que
 * identifica l'aula (també a les IP), i el nom si en té. «A.004 · Rosalia»,
 * «Consergeria». Es desa a `Space.name` en crear-lo o editar-lo, i així totes
 * les pantalles i exportacions el mostren igual sense haver-lo de compondre.
 */
export function spaceName({ number, roomName }: { number?: string | null; roomName?: string | null }) {
  const parts = [number?.trim(), roomName?.trim()].filter((part): part is string => Boolean(part));
  // Si el nom és el mateix número, no cal repetir-lo.
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0];
  return parts.join(" · ");
}
