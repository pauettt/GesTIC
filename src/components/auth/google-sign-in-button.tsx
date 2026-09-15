"use client";

import Image from "next/image";
import { LoaderCircleIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Botó del formulari d'entrar amb Google. Queda aturat des del primer toc fins
 * que el navegador arriba a Google: Next manté l'acció pendent mentre la pàgina
 * no es descarrega.
 *
 * Una segona entrada començada abans d'arribar a Google (un doble toc mentre el
 * servidor es desperta) trepitja la cookie de verificació (PKCE) de la primera,
 * i Google en rebutja la tornada amb `invalid_grant: Invalid code verifier`. Va
 * sortir així als logs de producció el 2026-09-15, i a la pantalla semblava que
 * calia entrar dues vegades.
 */
export function GoogleSignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <LoaderCircleIcon className="mr-2 size-[18px] animate-spin" />
      ) : (
        <Image src="/google.svg" alt="" width={18} height={18} className="mr-2" />
      )}
      {pending ? "Obrint Google…" : "Inicia sessió amb Google"}
    </Button>
  );
}
