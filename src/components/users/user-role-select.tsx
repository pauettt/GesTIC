"use client";

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
  const { run, isPending } = useServerAction(setUserRole, {
    successMessage: `Permisos de ${userName} actualitzats`,
  });

  return (
    <Select
      value={role}
      onValueChange={(next) => next && run({ userId, role: next })}
      items={ASSIGNABLE}
      disabled={isPending}
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
