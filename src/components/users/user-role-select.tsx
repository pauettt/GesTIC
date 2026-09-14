"use client";

import { useOptimistic } from "react";
import type { Role } from "@prisma/client";

import { setUserRole } from "@/actions/users";
import { useServerAction } from "@/hooks/use-server-action";
import { roleLabels } from "@/lib/labels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASSIGNABLE: Record<string, string> = {
  ADMIN: roleLabels.ADMIN,
  CONSERGERIA: roleLabels.CONSERGERIA,
  PROFESSOR: roleLabels.PROFESSOR,
};

export function UserRoleSelect({
  userId,
  role,
  userName,
}: {
  userId: string;
  role: Role;
  userName: string;
}) {
  // Com la casella de tutor/a: el permís triat es veu al moment, sense esperar
  // que el servidor torni a pintar la pàgina, i si el rebutja torna al d'abans.
  // El que en depèn —la casella de tutor/a desapareix a consergeria— arriba amb
  // la resposta del servidor, que és qui ho decideix.
  const [value, setValue] = useOptimistic(role);
  const { run } = useServerAction<{ userId: string; role: Role }>(setUserRole, {
    optimistic: (input) => setValue(input.role),
    successMessage: `Permisos de ${userName} actualitzats`,
  });

  return (
    <Select
      value={value}
      onValueChange={(next) => next && run({ userId, role: next })}
      items={ASSIGNABLE}
    >
      <SelectTrigger aria-label={`Permís de ${userName}`} size="sm" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ASSIGNABLE).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
