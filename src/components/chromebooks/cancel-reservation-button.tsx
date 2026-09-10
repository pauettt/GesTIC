"use client";

import { XIcon } from "lucide-react";

import { cancelReservation } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const { run, isPending } = useServerAction(cancelReservation, {
    successMessage: "Reserva cancel·lada",
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() => run({ id: reservationId })}
    >
      <XIcon className="size-4" />
    </Button>
  );
}
