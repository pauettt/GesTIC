"use client";

import { Controller, type Control } from "react-hook-form";

import { incidentPriorityLabels } from "@/lib/labels";
import type { CreateIncidentInput } from "@/lib/validations/incident";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PriorityField({
  control,
  label,
  idPrefix,
}: {
  control: Control<CreateIncidentInput>;
  label: string;
  idPrefix: string;
}) {
  const id = `${idPrefix}-priority`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} items={incidentPriorityLabels}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(incidentPriorityLabels).map(([value, priorityLabel]) => (
                <SelectItem key={value} value={value}>
                  {priorityLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
