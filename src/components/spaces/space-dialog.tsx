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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
    defaultValues: space ?? { name: "", building: "", floor: "" },
  });

  const { run, isPending } = useServerAction(upsertSpace, {
    successMessage: space ? "Espai actualitzat" : "Espai creat",
    onSuccess: () => {
      setOpen(false);
      reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="space-name">Nom</FieldLabel>
              <Input id="space-name" placeholder="Ex: Aula 2.03" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>
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
