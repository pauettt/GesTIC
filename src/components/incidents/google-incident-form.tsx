"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createIncident } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import { googleServiceLabels } from "@/lib/labels";
import { createIncidentSchema, type CreateIncidentInput } from "@/lib/validations/incident";
import { Button } from "@/components/ui/button";
import { PriorityField } from "@/components/incidents/priority-field";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IncidentPhotosField } from "@/components/incidents/incident-photos-field";

export function GoogleIncidentForm() {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      description: "",
      photoUrls: [],
      priority: "MITJANA",
      targetType: "GOOGLE_WORKSPACE",
    },
  });

  const { run, isPending } = useServerAction(createIncident);
  const googleService = useWatch({ control, name: "googleService" });

  function onSubmit(values: CreateIncidentInput) {
    run(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.googleService)}>
          <FieldLabel htmlFor="google-service">1. Quin servei falla?</FieldLabel>
          <Controller
            control={control}
            name="googleService"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange} items={googleServiceLabels}>
                <SelectTrigger id="google-service" className="w-full">
                  <SelectValue placeholder="Selecciona el servei de Google" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(googleServiceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={errors.googleService ? [errors.googleService] : undefined} />
        </Field>

        {googleService && (
          <>
            <PriorityField control={control} idPrefix="google" label="2. Prioritat" />

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="google-description">3. Descripció breu</FieldLabel>
              <Textarea
                id="google-description"
                rows={4}
                placeholder="Explica què passa i des de quan. Si afecta un compte, un curs o un grup concret, digues quin."
                {...register("description")}
              />
              <FieldError errors={errors.description ? [errors.description] : undefined} />
            </Field>

            <Field>
              <FieldLabel>4. Captures de pantalla</FieldLabel>
              <Controller
                control={control}
                name="photoUrls"
                render={({ field }) => (
                  <IncidentPhotosField
                    mode="screenshot"
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel·la
          </Button>
          <Button type="submit" disabled={isPending || !googleService}>
            {isPending ? "Enviant…" : "Crea la incidència"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
