"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createIncident } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import { createIncidentSchema, type CreateIncidentInput } from "@/lib/validations/incident";
import { Button } from "@/components/ui/button";
import { CategoryField } from "@/components/incidents/category-field";
import { PriorityField } from "@/components/incidents/priority-field";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IncidentPhotosField } from "@/components/incidents/incident-photos-field";
import type { IncidentTargetType } from "@prisma/client";

type InventoryItem = { id: string; brand: string; model: string; spaceId: string | null };
type Cart = { id: string; name: string; spaceId: string | null; chromebooks: { id: string; assetTag: string }[] };
type Space = { id: string; name: string };

type ObjectOption = {
  value: string;
  label: string;
  targetType: IncidentTargetType;
  inventoryItemId?: string;
  cartId?: string;
  chromebookId?: string;
};

export function RoomIncidentForm({
  spaces,
  inventoryItems,
  carts,
}: {
  spaces: Space[];
  inventoryItems: InventoryItem[];
  carts: Cart[];
}) {
  const router = useRouter();
  const [objectValue, setObjectValue] = useState("");
  const {
    control,
    register,
    handleSubmit,
        setValue,
    formState: { errors },
  } = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      spaceId: "",
      inventoryItemId: "",
      cartId: "",
      chromebookId: "",
      description: "",
      photoUrls: [],
      priority: "MITJANA",
      targetType: "GENERAL",
    },
  });

  const { run, isPending } = useServerAction(createIncident);
  const spaceId = useWatch({ control, name: "spaceId" });
  const targetType = useWatch({ control, name: "targetType" });

  const objectOptions = useMemo<ObjectOption[]>(() => {
    if (!spaceId) return [];
    const options: ObjectOption[] = [];
    inventoryItems
      .filter((item) => item.spaceId === spaceId)
      .forEach((item) => {
        options.push({
          value: `item:${item.id}`,
          label: `${item.brand} ${item.model}`,
          targetType: "INVENTORY_ITEM",
          inventoryItemId: item.id,
        });
      });
    carts
      .filter((cart) => cart.spaceId === spaceId)
      .forEach((cart) => {
        options.push({
          value: `cart:${cart.id}`,
          label: `Carro sencer: ${cart.name}`,
          targetType: "CART",
          cartId: cart.id,
        });
        cart.chromebooks.forEach((chromebook) => {
          options.push({
            value: `chromebook:${chromebook.id}`,
            label: `Chromebook ${chromebook.assetTag} (carro ${cart.name})`,
            targetType: "CHROMEBOOK",
            chromebookId: chromebook.id,
            cartId: cart.id,
          });
        });
      });
    options.push({ value: "general", label: "Un altre problema en aquest espai", targetType: "GENERAL" });
    return options;
  }, [spaceId, inventoryItems, carts]);

  function handleSpaceChange(value: string | null) {
    setValue("spaceId", value ?? "");
    setObjectValue("");
    setValue("targetType", "GENERAL");
    setValue("inventoryItemId", "");
    setValue("cartId", "");
    setValue("chromebookId", "");
    setValue("category", undefined);
  }

  function handleObjectChange(value: string | null) {
    setObjectValue(value ?? "");
    const option = objectOptions.find((candidate) => candidate.value === value);
    setValue("targetType", option?.targetType ?? "GENERAL");
    setValue("inventoryItemId", option?.inventoryItemId ?? "");
    setValue("cartId", option?.cartId ?? "");
    setValue("chromebookId", option?.chromebookId ?? "");
    setValue("category", undefined);
  }

  function onSubmit(values: CreateIncidentInput) {
    run(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.spaceId)}>
          <FieldLabel htmlFor="room-spaceId">1. On és el problema?</FieldLabel>
          <Select
            value={spaceId}
            onValueChange={handleSpaceChange}
            items={toSelectItems(spaces, (s) => s.id, (s) => s.name)}
          >
            <SelectTrigger id="room-spaceId" className="w-full">
              <SelectValue placeholder="Selecciona l'aula o espai" />
            </SelectTrigger>
            <SelectContent>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={errors.spaceId ? [errors.spaceId] : undefined} />
        </Field>

        {spaceId && (
          <Field data-invalid={Boolean(errors.inventoryItemId)}>
            <FieldLabel htmlFor="room-objectId">2. Quin objecte té el problema?</FieldLabel>
            <Select
              value={objectValue}
              onValueChange={handleObjectChange}
              items={toSelectItems(objectOptions, (o) => o.value, (o) => o.label)}
            >
              <SelectTrigger id="room-objectId" className="w-full">
                <SelectValue placeholder="Selecciona l'objecte afectat" />
              </SelectTrigger>
              <SelectContent>
                {objectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={errors.inventoryItemId ? [errors.inventoryItemId] : undefined} />
          </Field>
        )}

        {targetType === "CHROMEBOOK" && objectValue && (
          <CategoryField control={control} idPrefix="room" />
        )}

        {objectValue && (
          <>
            <PriorityField control={control} idPrefix="room" label="3. Prioritat" />

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="room-description">4. Descripció breu</FieldLabel>
              <Textarea
                id="room-description"
                rows={4}
                placeholder="Explica què passa, des de quan i en quines circumstàncies."
                {...register("description")}
              />
              <FieldError errors={errors.description ? [errors.description] : undefined} />
            </Field>

            <Field>
              <FieldLabel>5. Fotos del problema</FieldLabel>
              <Controller
                control={control}
                name="photoUrls"
                render={({ field }) => (
                  <IncidentPhotosField value={field.value ?? []} onChange={field.onChange} />
                )}
              />
            </Field>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel·la
          </Button>
          <Button type="submit" disabled={isPending || !objectValue}>
            {isPending ? "Enviant…" : "Crea la incidència"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
