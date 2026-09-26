export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * El nom de màquina del nostre blob store, tret del token del servidor
 * (`vercel_blob_rw_<store>_<secret>`, el mateix que fa `@vercel/blob`). Al
 * navegador el token no hi és, i llavors torna `null`.
 */
export function ownBlobHost(token = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const storeId = token?.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}${BLOB_HOST_SUFFIX}` : null;
}

/**
 * Comprova que una URL apunti realment a un fitxer del nostre blob store. Tot el
 * que s'acaba renderitzant com a `href` o `src` (adjunts d'incidències, fotos
 * d'inventari) ha de passar per aquí: sense la comprovació s'hi podria desar un
 * enllaç extern arbitrari o un `javascript:`.
 *
 * Al servidor, que té el token, només val el nostre store: un fitxer penjat al
 * blob store d'un altre projecte de Vercel també acaba en el mateix domini. Al
 * navegador, que no el té, n'hi ha prou amb el domini: és només per avisar abans
 * d'enviar, i qui decideix és el servidor.
 */
export function isBlobUrl(value: string, host = ownBlobHost()): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return host ? url.hostname === host : url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}
