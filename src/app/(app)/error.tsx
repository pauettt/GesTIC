"use client";

import { useEffect } from "react";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

// `retry` i no `reset`: `reset` només torna a pintar el que ja hi havia, i si
// l'error venia del servidor (la base de dades un moment caiguda) el botó
// tornava a ensenyar el mateix error sense haver-ho provat de nou. `retry` torna
// a demanar la pàgina al servidor abans de pintar-la.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app] error no controlat:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <TriangleAlertIcon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Alguna cosa no ha funcionat</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          No hem pogut carregar aquesta pàgina. Torna-ho a provar; si continua passant, avisa la
          coordinació TIC.
        </p>
      </div>
      <Button onClick={retry}>
        <RefreshCwIcon className="size-4" />
        Torna-ho a provar
      </Button>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Codi de l&apos;error: <code>{error.digest}</code>
        </p>
      )}
    </div>
  );
}
