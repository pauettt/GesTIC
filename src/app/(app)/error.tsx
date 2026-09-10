"use client";

import { useEffect } from "react";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
      <Button onClick={reset}>
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
