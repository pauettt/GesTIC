"use client";

import type { QueryStatus } from "@prisma/client";

import { updateQueryStatus } from "@/actions/queries";
import { useServerAction } from "@/hooks/use-server-action";
import { queryStatusLabels } from "@/lib/labels";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QueryStatusControls({ queryId, status }: { queryId: string; status: QueryStatus }) {
  const { run } = useServerAction(updateQueryStatus, { successMessage: "Estat actualitzat" });

  return (
    <Field>
      <FieldLabel htmlFor="query-status">Estat</FieldLabel>
      <Select
        value={status}
        onValueChange={(value) => run({ queryId, status: value as QueryStatus })}
        items={queryStatusLabels}
      >
        <SelectTrigger id="query-status" className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(queryStatusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
