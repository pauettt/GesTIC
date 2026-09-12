"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { createStudentDeviceRequest } from "@/actions/student-devices";
import { useServerAction } from "@/hooks/use-server-action";
import { studentDeviceReasonLabels } from "@/lib/labels";
import {
  createStudentDeviceRequestSchema,
  type CreateStudentDeviceRequestInput,
} from "@/lib/validations/student-devices";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EMPTY: CreateStudentDeviceRequestInput = {
  studentFirstName: "",
  studentLastName: "",
  groupName: "",
  reason: "SENSE_DISPOSITIU",
  reasonNote: "",
};

export function StudentRequestDialog() {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStudentDeviceRequestInput>({
    resolver: zodResolver(createStudentDeviceRequestSchema),
    defaultValues: EMPTY,
  });

  const reason = useWatch({ control, name: "reason" });

  const { run, isPending } = useServerAction(createStudentDeviceRequest, {
    successMessage: "Sol·licitud enviada a la coordinació TIC",
    onSuccess: () => {
      setOpen(false);
      reset(EMPTY);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="size-4" />
            Demana un Chromebook
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chromebook per a un alumne/a</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.studentFirstName)}>
                <FieldLabel htmlFor="studentFirstName">Nom</FieldLabel>
                <Input id="studentFirstName" {...register("studentFirstName")} />
                <FieldError
                  errors={errors.studentFirstName ? [errors.studentFirstName] : undefined}
                />
              </Field>
              <Field data-invalid={Boolean(errors.studentLastName)}>
                <FieldLabel htmlFor="studentLastName">Cognoms</FieldLabel>
                <Input id="studentLastName" {...register("studentLastName")} />
                <FieldError
                  errors={errors.studentLastName ? [errors.studentLastName] : undefined}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="groupName">Grup</FieldLabel>
              <Input id="groupName" placeholder="Ex: 2n ESO B" {...register("groupName")} />
              <p className="text-xs text-muted-foreground">
                No cal, però ajuda la coordinació a saber a qui reclamar l&apos;equip a final de
                curs.
              </p>
            </Field>

            <Field data-invalid={Boolean(errors.reason)}>
              <FieldLabel htmlFor="reason">Motiu</FieldLabel>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                    items={studentDeviceReasonLabels}
                  >
                    <SelectTrigger id="reason" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(studentDeviceReasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={errors.reason ? [errors.reason] : undefined} />
            </Field>

            <Field data-invalid={Boolean(errors.reasonNote)}>
              <FieldLabel htmlFor="reasonNote">
                Comentari {reason === "ALTRE" ? "" : "(opcional)"}
              </FieldLabel>
              <Textarea
                id="reasonNote"
                rows={3}
                placeholder={
                  reason === "ALTRE"
                    ? "Explica breument per què necessita l'equip"
                    : "Alguna cosa que la coordinació hagi de saber"
                }
                {...register("reasonNote")}
              />
              <p className="text-xs text-muted-foreground">
                No cal donar detalls de la situació familiar: amb el motiu de dalt n&apos;hi ha
                prou per decidir-ho.
              </p>
              <FieldError errors={errors.reasonNote ? [errors.reasonNote] : undefined} />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel·la
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enviant…" : "Envia la sol·licitud"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
