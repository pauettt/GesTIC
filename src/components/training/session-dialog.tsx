"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertTrainingSession } from "@/actions/training";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import {
  upsertTrainingSessionSchema,
  type UpsertTrainingSessionInput,
} from "@/lib/validations/training";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Space = { id: string; name: string };

export function SessionDialog({
  spaces,
  session,
  trigger,
}: {
  spaces: Space[];
  session?: UpsertTrainingSessionInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertTrainingSessionInput>({
    resolver: zodResolver(upsertTrainingSessionSchema),
    defaultValues: session ?? {
      title: "",
      description: "",
      date: "",
      spaceId: "",
      capacity: "",
      materialsUrl: "",
    },
  });

  const { run, isPending } = useServerAction(upsertTrainingSession, {
    successMessage: session ? "Sessió actualitzada" : "Sessió creada",
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
            <Button>
              <PlusIcon className="size-4" />
              Nova sessió
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? "Edita la sessió" : "Nova sessió de formació"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="title">Títol</FieldLabel>
              <Input id="title" {...register("title")} />
              <FieldError errors={errors.title ? [errors.title] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="description">Descripció</FieldLabel>
              <Textarea id="description" rows={3} {...register("description")} />
              <FieldError errors={errors.description ? [errors.description] : undefined} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.date)}>
                <FieldLabel htmlFor="date">Data i hora</FieldLabel>
                <Input id="date" type="datetime-local" {...register("date")} />
                <FieldError errors={errors.date ? [errors.date] : undefined} />
              </Field>
              <Field>
                <FieldLabel htmlFor="capacity">Places (opcional)</FieldLabel>
                <Input id="capacity" type="number" min={1} {...register("capacity")} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="spaceId">Espai</FieldLabel>
              <Controller
                control={control}
                name="spaceId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={toSelectItems(spaces, (s) => s.id, (s) => s.name)}
                  >
                    <SelectTrigger id="spaceId" className="w-full">
                      <SelectValue placeholder="Sense espai concret" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="materialsUrl">Enllaç a materials (opcional)</FieldLabel>
              <Input id="materialsUrl" placeholder="https://…" {...register("materialsUrl")} />
            </Field>
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
