import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { REQUESTED_PATH_HEADER, loginPath } from "@/lib/login-redirect";
import { SESSION_COOKIE_NAMES } from "@/lib/session-cookie";

// Comprovació optimista: només mira si existeix la cookie de sessió.
// La validació real (usuari vàlid + rol) es fa sempre a cada layout/Server Action,
// tal com recomana Next.js 16 perquè Proxy no cobreix les Server Actions.
export function proxy(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname + request.nextUrl.search;
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(loginPath(requestedPath), request.url));
  }

  // Tenir la cookie no vol dir tenir sessió: pot ser d'una sessió caducada o
  // esborrada. Llavors és la pàgina qui envia a l'inici de sessió, i sense
  // aquesta capçalera no sabria on tornar: qui escanejava el QR d'un carro amb
  // una sessió vella al mòbil acabava a l'inici en comptes de al carro.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUESTED_PATH_HEADER, requestedPath);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // El negative lookahead exclou també qualsevol fitxer amb extensió
  // (.*\..*): sense això, el Proxy intercepta els assets estàtics de
  // `public/` (google.svg, favicons, etc.) i els redirigeix a /login quan
  // no hi ha sessió, deixant-los "trencats" a la pantalla de login mateixa.
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
