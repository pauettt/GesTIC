"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertSpace } from "@/actions/spaces";
import { useServerAction } from "@/hooks/use-server-action";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const EMPTY: UpsertSpaceInput = { number: "", roomName: "", building: "", floor: "" };

export function SpaceDialog({
  space,
  trigger,
}: {
  space?: UpsertSpaceInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertSpaceInput>({
    resolver: zodResolver(upsertSpaceSchema),
    defaultValues: space ?? EMPTY,
  });

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
                <FieldLabel htmlFor="building">Edifici</FieldLabel>
                <Input id="building" {...register("building")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="floor">Planta</FieldLabel>
                <Input id="floor" {...register("floor")} />
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
