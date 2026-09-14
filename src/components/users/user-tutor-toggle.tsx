"use client";

import { useOptimistic } from "react";

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
  // Sense això la casella esperava que el servidor desés el canvi i tornés a
  // pintar tota la pàgina, gairebé un segon, i semblava que el clic no havia
  // anat. Ara es marca al moment; si el servidor ho rebutja, torna com era i
  // surt l'error.
  const [checked, setChecked] = useOptimistic(isTutor);
  const { run } = useServerAction<{ userId: string; isTutor: boolean }>(setUserTutor, {
    optimistic: (input) => setChecked(input.isTutor),
    // "Ja consta" es llegia com "ja hi constava abans", i semblava que el clic
    // no havia canviat res.
    successMessage: (input) =>
      input.isTutor ? `${userName} ara consta com a tutor/a` : `${userName} ja no consta com a tutor/a`,
  });

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => run({ userId, isTutor: value === true })}
      aria-label={`Tutor/a de grup: ${userName}`}
    />
  );
}
