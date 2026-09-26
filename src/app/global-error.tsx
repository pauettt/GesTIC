"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * L'últim recurs: surt quan falla el mateix layout arrel, o una pàgina que en
 * penja directament, com la d'inici de sessió. Substitueix el layout sencer, i
 * per això porta el seu `<html>` i els estils. La resta d'errors els agafa
 * `(app)/error.tsx`, dins de l'aplicació. Sense aquest fitxer, Next ensenyava la
 * seva pàgina genèrica en anglès.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app] error no controlat al layout arrel:", error);
  }, [error]);

  return (
    <html lang="ca" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-background p-6 text-center font-sans text-foreground">
        <title>Alguna cosa no ha funcionat · gesTIC</title>
        <div>
          <h1 className="text-xl font-semibold">Alguna cosa no ha funcionat</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            No hem pogut carregar gesTIC. Torna-ho a provar; si continua passant, avisa la
            coordinació TIC.
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Torna-ho a provar
        </button>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Codi de l&apos;error: <code>{error.digest}</code>
          </p>
        )}
      </body>
    </html>
  );
}
