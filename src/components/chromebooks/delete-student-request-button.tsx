"use client";

import type { StudentDeviceRequestStatus } from "@prisma/client";

import { deleteStudentDeviceRequest } from "@/actions/student-devices";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";

export function DeleteStudentRequestButton({ id, status, studentName }: {
  id: string;
  status: StudentDeviceRequestStatus;
  studentName: string;
}) {
  const assignment = status === "ENTREGADA"
    ? " Consta que l'equip està entregat: deixarà de constar assignat a aquest alumne/a. Si és un préstec real i l'equip encara és a casa seva, conserva la sol·licitud fins que el torni."
    : status === "APROVADA"
      ? " L'equip deixarà d'estar apartat per a aquest alumne/a."
      : "";

  return (
    <ConfirmDeleteButton
      action={deleteStudentDeviceRequest}
      input={{ id, status }}
      label={`Elimina la sol·licitud de ${studentName}`}
      title={`Eliminar la sol·licitud de ${studentName}?`}
      description={`S'esborraran definitivament la sol·licitud i el seu historial. Aquesta acció no es pot desfer.${assignment}`}
    />
  );
}
