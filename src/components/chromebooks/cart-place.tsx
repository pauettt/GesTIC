import { MapPinIcon } from "lucide-react";

import { spacePlace, type PlacedSpace } from "@/lib/locations";
import { cn } from "@/lib/utils";

/**
 * On és un carro: l'edifici, la planta i l'aula. Entre dos carros lliures, és el
 * que fa triar, perquè ningú no en vol arrossegar un de l'altra punta del centre.
 */
export function CartPlace({ space, className }: { space: PlacedSpace | null; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1 text-muted-foreground", className)}>
      {/* En em, perquè quedi a la primera línia amb qualsevol mida de lletra. */}
      <MapPinIcon className="mt-[0.2em] size-[1em] shrink-0" aria-hidden />
      {space ? spacePlace(space) : "Sense ubicació fixa"}
    </p>
  );
}
