const collator = new Intl.Collator("ca", { numeric: true, sensitivity: "base" });

/** Ordre del carro; ignora equips que ja no hi són i afegeix els nous al final. */
export function orderChromebooks<T extends { id: string; assetTag: string }>(
  devices: readonly T[],
  order: readonly string[] = [],
): T[] {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...devices].sort((a, b) => {
    const aPosition = positions.get(a.id) ?? order.length;
    const bPosition = positions.get(b.id) ?? order.length;
    return aPosition - bPosition || collator.compare(a.assetTag, b.assetTag) || a.id.localeCompare(b.id);
  });
}

/** Mou un equip a la posició clicada, desplaçant els que hi ha entremig. */
export function moveChromebook(order: readonly string[], id: string, targetId: string): string[] {
  const from = order.indexOf(id);
  const to = order.indexOf(targetId);
  const next = [...order];
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
