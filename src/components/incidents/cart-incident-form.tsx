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

type Cart = { id: string; name: string; chromebooks: { id: string; assetTag: string }[] };

type ObjectOption =
  | { value: string; label: string; targetType: "CART" }
  | { value: string; label: string; targetType: "CHROMEBOOK"; chromebookId: string };

export function CartIncidentForm({ carts }: { carts: Cart[] }) {
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
      cartId: "",
      chromebookId: "",
      description: "",
      photoUrls: [],
      priority: "MITJANA",
      targetType: "CART",
    },
  });

  const { run, isPending } = useServerAction(createIncident);
  const cartId = useWatch({ control, name: "cartId" });
  const targetType = useWatch({ control, name: "targetType" });
  const selectedCart = carts.find((cart) => cart.id === cartId);

  const objectOptions = useMemo<ObjectOption[]>(() => {
    if (!selectedCart) return [];
    return [
      { value: "cart", label: "El carro sencer", targetType: "CART" },
      ...selectedCart.chromebooks.map(
        (chromebook): ObjectOption => ({
          value: `chromebook:${chromebook.id}`,
          label: `Chromebook ${chromebook.assetTag}`,
          targetType: "CHROMEBOOK",
          chromebookId: chromebook.id,
        }),
      ),
    ];
  }, [selectedCart]);

  function handleCartChange(value: string | null) {
    setValue("cartId", value ?? "");
    setObjectValue("");
    setValue("targetType", "CART");
    setValue("chromebookId", "");
    setValue("category", undefined);
  }

  function handleObjectChange(value: string | null) {
    setObjectValue(value ?? "");
    const option = objectOptions.find((candidate) => candidate.value === value);
    setValue("targetType", option?.targetType ?? "CART");
    setValue("chromebookId", option?.targetType === "CHROMEBOOK" ? option.chromebookId : "");
    setValue("category", undefined);
  }

  function onSubmit(values: CreateIncidentInput) {
    run(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.cartId)}>
          <FieldLabel htmlFor="cart-cartId">1. Quin carro?</FieldLabel>
          <Select
            value={cartId}
            onValueChange={handleCartChange}
            items={toSelectItems(carts, (c) => c.id, (c) => c.name)}
          >
            <SelectTrigger id="cart-cartId" className="w-full">
              <SelectValue placeholder="Selecciona el carro (no cal saber en quina aula és ara)" />
            </SelectTrigger>
            <SelectContent>
              {carts.map((cart) => (
                <SelectItem key={cart.id} value={cart.id}>
                  {cart.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={errors.cartId ? [errors.cartId] : undefined} />
        </Field>

        {cartId && (
          <Field data-invalid={Boolean(errors.chromebookId)}>
            <FieldLabel htmlFor="cart-objectId">2. El carro sencer o un Chromebook concret?</FieldLabel>
            <Select
              value={objectValue}
              onValueChange={handleObjectChange}
              items={toSelectItems(objectOptions, (o) => o.value, (o) => o.label)}
            >
              <SelectTrigger id="cart-objectId" className="w-full">
                <SelectValue placeholder="Selecciona una opció" />
              </SelectTrigger>
              <SelectContent>
                {objectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={errors.chromebookId ? [errors.chromebookId] : undefined} />
          </Field>
        )}

        {targetType === "CHROMEBOOK" && objectValue && <CategoryField control={control} idPrefix="cart" />}

        {objectValue && (
          <>
            <PriorityField control={control} idPrefix="cart" label="3. Prioritat" />

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="cart-description">4. Descripció breu</FieldLabel>
              <Textarea
                id="cart-description"
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
