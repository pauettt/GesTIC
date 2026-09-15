import type { Route } from "next";

/** Capçalera amb què el Proxy passa a les pàgines l'adreça que s'ha demanat. */
export const REQUESTED_PATH_HEADER = "x-gestic-path";

/**
 * L'adreça de l'inici de sessió que, un cop dins, torna on s'anava. Només accepta
 * camins interns: una URL sencera, `//altre-lloc` o `/\altre-lloc` (que els
 * navegadors llegeixen com `//`) portarien fora de gesTIC.
 */
export function loginPath(callbackUrl: string | null | undefined): Route {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl[1] === "/" || callbackUrl[1] === "\\") {
    return "/login";
  }
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
}
