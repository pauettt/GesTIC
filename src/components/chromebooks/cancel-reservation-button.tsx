"use client";

import { XIcon } from "lucide-react";

import { cancelReservation } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

/** `fixed`: és la d'una setmana d'una reserva fixa, i cancel·lar-la només allibera aquella setmana. */
export function CancelReservationButton({ reservationId, fixed = false }: { reservationId: string; fixed?: boolean }) {
  const { run, isPending } = useServerAction(cancelReservation, {
    successMessage: fixed ? "Setmana alliberada" : "Reserva cancel·lada",
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label={fixed ? "Allibera aquesta setmana" : "Cancel·la la reserva"}
      title={fixed ? "Allibera aquesta setmana" : undefined}
      onClick={() => run({ id: reservationId })}
    >
      <XIcon className="size-4" />
    </Button>
  );
}
