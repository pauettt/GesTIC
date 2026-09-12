"use client";

import { setUserTutor } from "@/actions/users";
import { useServerAction } from "@/hooks/use-server-action";
import { Checkbox } from "@/components/ui/checkbox";

export function UserTutorToggle({
  userId,
  isTutor,
  userName,
}: {
  userId: string;
  isTutor: boolean;
  userName: string;
}) {
  // El missatge es construeix amb el valor d'abans del clic: si ara consta com
  // a tutor/a, el que farà la casella és treure-li la marca.
  const { run, isPending } = useServerAction(setUserTutor, {
    successMessage: isTutor
      ? `${userName} ja no consta com a tutor/a`
      : `${userName} ja consta com a tutor/a`,
  });

  return (
    <Checkbox
      checked={isTutor}
      onCheckedChange={(value) => run({ userId, isTutor: value === true })}
      disabled={isPending}
      aria-label={`Tutor/a de grup: ${userName}`}
    />
  );
}
