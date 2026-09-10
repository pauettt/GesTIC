export { cn } from "cn";

// Base UI's <Select> necessita un mapa value->label explícit (prop `items`)
// per poder mostrar l'etiqueta de l'opció seleccionada al SelectValue —
// si no, ensenya el value en cru (per exemple l'id). Aquest helper el genera
// a partir d'una llista d'objectes.
export function toSelectItems<T>(
  items: T[],
  getValue: (item: T) => string,
  getLabel: (item: T) => string,
): Record<string, string> {
  return Object.fromEntries(items.map((item) => [getValue(item), getLabel(item)]));
}
