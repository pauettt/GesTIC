"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertStudentChromebook } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import {
  upsertStudentChromebookSchema,
  type UpsertStudentChromebookInput,
} from "@/lib/validations/chromebooks";
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

const EMPTY: UpsertStudentChromebookInput = {
  assetTag: "",
  serialNumber: "",
  brand: "",
  model: "",
};

/**
 * Alta i edició d'un equip del pool de préstec a l'alumnat. És bessó de
 * `ChromebookDialog`, però aquell demana el carro i aquí no n'hi ha cap, i el
 * número de sèrie hi és obligatori.
 *
 * Els identificadors dels camps van amb prefix perquè a /chromebooks aquest
 * diàleg conviu amb el del carro, que fa servir els mateixos noms.
 */
export function StudentChromebookDialog({
  chromebook,
  trigger,
}: {
  chromebook?: UpsertStudentChromebookInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertStudentChromebookInput>({
    resolver: zodResolver(upsertStudentChromebookSchema),
    defaultValues: chromebook ?? EMPTY,
  });

  const { run, isPending } = useServerAction(upsertStudentChromebook, {
    successMessage: chromebook ? "Chromebook actualitzat" : "Chromebook afegit al pool",
    onSuccess: () => {
      setOpen(false);
      if (!chromebook) reset(EMPTY);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm">
              <PlusIcon className="size-4" />
              Nou equip de préstec
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {chromebook ? "Edita l'equip de préstec" : "Nou equip de préstec"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.assetTag)}>
              <FieldLabel htmlFor="student-assetTag">Identificador</FieldLabel>
              <Input
                id="student-assetTag"
                placeholder="Ex: CB-A-01"
                {...register("assetTag")}
              />
              <FieldError errors={errors.assetTag ? [errors.assetTag] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.serialNumber)}>
              <FieldLabel htmlFor="student-serialNumber">Número de sèrie</FieldLabel>
              <Input id="student-serialNumber" {...register("serialNumber")} />
              <FieldError errors={errors.serialNumber ? [errors.serialNumber] : undefined} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="student-brand">Marca</FieldLabel>
                <Input id="student-brand" placeholder="Ex: Acer" {...register("brand")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="student-model">Model</FieldLabel>
                <Input
                  id="student-model"
                  placeholder="Ex: Chromebook Spin 511"
                  {...register("model")}
                />
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
