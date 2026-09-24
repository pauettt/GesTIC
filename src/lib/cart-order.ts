const collator = new Intl.Collator("ca", { numeric: true, sensitivity: "base" });

/** Ordre dels carros; ignora carros que ja no hi són i afegeix els nous al final ordenats. */
export function orderCarts<T extends { id: string; name: string }>(
  carts: readonly T[],
  order: readonly string[] = [],
): T[] {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...carts].sort((a, b) => {
    const aPosition = positions.get(a.id) ?? order.length;
    const bPosition = positions.get(b.id) ?? order.length;
    return aPosition - bPosition || collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}

/** Mou un carro a la posició clicada, desplaçant els que hi ha entremig. */
export function moveCart(order: readonly string[], id: string, targetId: string): string[] {
  const from = order.indexOf(id);
  const to = order.indexOf(targetId);
  const next = [...order];
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
