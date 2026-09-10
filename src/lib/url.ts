import { headers } from "next/headers";

/**
 * URL base de l'aplicació. `APP_URL` mana sobre tota la resta a propòsit:
 *
 * Les etiquetes QR s'enganxen físicament als Chromebooks i els enllaços dels
 * correus arriben a bústies que es llegeixen dies després. Si es construïssin
 * amb la capçalera `host` del moment, imprimir des de `localhost:3000` o des
 * d'una URL de previsualització de Vercel deixaria QR i enllaços morts.
 *
 * En local, sense `APP_URL`, es continua deduint del host: així no cal
 * configurar res per treballar.
 */
export async function getBaseUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Cert quan la URL base surt d'una deducció i no d'`APP_URL`. S'avisa allà on
 * es generen coses permanents (etiquetes QR) perquè ningú no imprimeixi
 * enganxines que apunten a localhost.
 */
export function isBaseUrlGuessed() {
  return !process.env.APP_URL?.trim();
}
