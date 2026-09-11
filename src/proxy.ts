import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

// Comprovació optimista: només mira si existeix la cookie de sessió.
// La validació real (usuari vàlid + rol) es fa sempre a cada layout/Server Action,
// tal com recomana Next.js 16 perquè Proxy no cobreix les Server Actions.
export function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
