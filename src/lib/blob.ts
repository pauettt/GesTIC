export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Comprova que una URL apunti realment a un fitxer del nostre blob store. Tot el
 * que s'acaba renderitzant com a `href` o `src` (adjunts d'incidències, fotos
 * d'inventari) ha de passar per aquí: sense la comprovació s'hi podria desar un
 * enllaç extern arbitrari o un `javascript:`.
 */
export function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}
