"use client";

import { XIcon } from "lucide-react";

import { cancelAppointment } from "@/actions/appointments";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function CancelAppointmentButton({
  appointmentId,
  label,
}: {
  appointmentId: string;
  label?: string;
}) {
  const { run, isPending } = useServerAction(cancelAppointment, {
    successMessage: "Cita cancel·lada",
  });

  if (label) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => run({ id: appointmentId })}
      >
        {isPending ? "Cancel·lant…" : label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Cancel·la la cita"
      disabled={isPending}
      onClick={() => run({ id: appointmentId })}
    >
      <XIcon className="size-4" />
    </Button>
  );
}
