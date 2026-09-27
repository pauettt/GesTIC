"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 60_000;

/**
 * Torna a demanar les dades de la pàgina al servidor cada minut i quan es torna
 * a la pestanya, perquè qui la té oberta tot el matí (consergeria, coordinació)
 * vegi les reserves i incidències noves sense recarregar. `router.refresh()`
 * conserva l'estat del client i la posició de la pàgina, però no refresquem
 * mentre algú escriu o té un diàleg obert per no trepitjar-li la feina.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function busy() {
      const el = document.activeElement;
      const editing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      return editing || document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
    }

    function refresh() {
      if (document.visibilityState !== "visible" || busy()) return;
      router.refresh();
    }

    const timer = window.setInterval(refresh, INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
