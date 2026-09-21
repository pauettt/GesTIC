"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertSpace } from "@/actions/spaces";
import { useServerAction } from "@/hooks/use-server-action";
import type { BuildingOption } from "@/lib/locations";
import { upsertSpaceSchema, type UpsertSpaceInput } from "@/lib/validations/space";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListOption = { id: string; name: string };

const EMPTY: UpsertSpaceInput = { number: "", roomName: "", buildingId: "", floorId: "" };

export function SpaceDialog({
  buildings,
  space,
  trigger,
}: {
  buildings: BuildingOption[];
  space?: UpsertSpaceInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UpsertSpaceInput>({
    resolver: zodResolver(upsertSpaceSchema),
    defaultValues: space ?? EMPTY,
  });

  const buildingId = useWatch({ control, name: "buildingId" });
  const floors = buildings.find((building) => building.id === buildingId)?.floors ?? [];

  const { run, isPending } = useServerAction(upsertSpace, {
    successMessage: space ? "Espai actualitzat" : "Espai creat",
    onSuccess: () => setOpen(false),
  });

  function handleOpenChange(next: boolean) {
    // Cada cop que s'obre, amb les dades d'ara: si ja s'havia editat, la pàgina porta les noves.
    if (next) reset(space ?? EMPTY);
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" />
              Nou espai
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{space ? "Edita l'espai" : "Nou espai"}</DialogTitle>
          <DialogDescription>
            El número és el que identifica l&apos;aula. Un espai sense número, com consergeria, en té prou amb
            el nom.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
              <Field data-invalid={Boolean(errors.number)}>
                <FieldLabel htmlFor="space-number">Número</FieldLabel>
                <Input id="space-number" placeholder="A.004" {...register("number")} />
                <FieldError errors={errors.number ? [errors.number] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.roomName)}>
                <FieldLabel htmlFor="space-room-name">Nom</FieldLabel>
                <Input id="space-room-name" placeholder="Rosalia" {...register("roomName")} />
                <FieldError errors={errors.roomName ? [errors.roomName] : undefined} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="space-building">Edifici</FieldLabel>
                <Controller
                  control={control}
                  name="buildingId"
                  render={({ field }) => (
                    <ListSelect
                      id="space-building"
                      value={field.value}
                      onChange={(next) => {
                        field.onChange(next);
                        // Les plantes són de cada edifici: la de l'anterior ja no hi és.
                        setValue("floorId", "");
                      }}
                      options={buildings}
                      emptyLabel="Sense edifici"
                    />
                  )}
                />
                {buildings.length === 0 && (
                  <FieldDescription>Es creen amb el botó «Edificis» de la pàgina.</FieldDescription>
                )}
              </Field>
              <Field data-invalid={Boolean(errors.floorId)}>
                <FieldLabel htmlFor="space-floor">Planta</FieldLabel>
                <Controller
                  control={control}
                  name="floorId"
                  render={({ field }) => (
                    <ListSelect
                      id="space-floor"
                      value={field.value}
                      onChange={field.onChange}
                      options={floors}
                      emptyLabel="Sense planta"
                      disabled={floors.length === 0}
                    />
                  )}
                />
                {buildingId && floors.length === 0 && (
                  <FieldDescription>Aquest edifici no té plantes. Es creen amb el botó «Plantes».</FieldDescription>
                )}
                <FieldError errors={errors.floorId ? [errors.floorId] : undefined} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel·la
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Desant…" : "Desa"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Desplegable d'una de les llistes de la pàgina. L'element `null` és el que permet tornar a deixar-lo buit. */
function ListSelect({
  id,
  value,
  onChange,
  options,
  emptyLabel,
  disabled,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: ListOption[];
  emptyLabel: string;
  disabled?: boolean;
}) {
  const items = [
    { value: null, label: emptyLabel },
    ...options.map((option) => ({ value: option.id, label: option.name })),
  ];

  return (
    <Select value={value || null} onValueChange={(next) => onChange(next ?? "")} items={items} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
