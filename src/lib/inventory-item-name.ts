/**
 * Com es diu un equip d'inventari a tot arreu: amb l'etiqueta davant, si en té
 * («PORT-03 · HP ProBook 450»), que és el que el distingeix d'uns altres d'iguals.
 */
export function inventoryItemName(item: { label: string | null; brand: string; model: string }) {
  const name = `${item.brand} ${item.model}`;
  return item.label ? `${item.label} · ${name}` : name;
}
