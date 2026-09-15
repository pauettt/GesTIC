"use client";

import { useEffect } from "react";

/**
 * Treu un paràmetre de l'adreça un cop la pàgina l'ha mostrat. És per als avisos
 * que arriben per la URL després d'una acció («Incidència enviada»): es veuen
 * aquell cop, i si es recarrega la pàgina o es copia l'enllaç ja no hi són.
 * `replaceState` no torna a demanar la pàgina al servidor, així que l'avís no
 * desapareix de la pantalla.
 */
export function CleanUrlParam({ name }: { name: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(name)) return;
    url.searchParams.delete(name);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [name]);

  return null;
}
