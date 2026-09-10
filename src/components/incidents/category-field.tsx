"use client";

import { Controller, type Control } from "react-hook-form";

import { incidentCategoryLabels } from "@/lib/labels";
import type { CreateIncidentInput } from "@/lib/validations/incident";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CategoryField({
  control,
  idPrefix,
}: {
  control: Control<CreateIncidentInput>;
  idPrefix: string;
}) {
  const id = `${idPrefix}-category`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>Tipus de problema</FieldLabel>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Select value={field.value ?? ""} onValueChange={field.onChange} items={incidentCategoryLabels}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder="Selecciona el problema" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(incidentCategoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
