/**
 * Comptes de prova: els que crea el botó de dev login, tots amb una adreça
 * `@local.test`. És un domini reservat (RFC 2606) que cap compte real del centre
 * no pot tenir, i per això permet trobar-los i esborrar-los sense risc de
 * confondre'ls amb professorat de debò.
 */
export const TEST_ACCOUNT_DOMAIN = "@local.test";

export function isTestAccountEmail(email: string) {
  return email.trim().toLowerCase().endsWith(TEST_ACCOUNT_DOMAIN);
}

export type CountItem = { count: number; one: string; many: string };

/** "3 incidències, 1 consulta i 2 cites": només el que no és zero, en català. */
export function formatCounts(items: CountItem[]) {
  const parts = items
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${item.count === 1 ? item.one : item.many}`);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;
}
