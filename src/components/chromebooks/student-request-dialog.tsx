"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { createStudentDeviceRequest } from "@/actions/student-devices";
import { useServerAction } from "@/hooks/use-server-action";
import { studentDeviceReasonLabels } from "@/lib/labels";
import type { AcademicStageOption } from "@/lib/academic-structure";
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
  groupId: "",
  reason: "SENSE_DISPOSITIU",
  reasonNote: "",
};

export function StudentRequestDialog({ stages }: { stages: AcademicStageOption[] }) {
  const [open, setOpen] = useState(false);
  const [stageId, setStageId] = useState("");
  const [courseId, setCourseId] = useState("");
  const stage = stages.find((item) => item.id === stageId);
  const course = stage?.courses.find((item) => item.id === courseId);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
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
      setStageId("");
      setCourseId("");
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="student-stage">Etapa</FieldLabel>
                <Select value={stageId} onValueChange={(value) => {
                  setStageId(value ?? "");
                  setCourseId("");
                  setValue("groupId", "");
                }} items={{ "": "Sense indicar", ...Object.fromEntries(stages.map((item) => [item.id, item.name])) }}>
                  <SelectTrigger id="student-stage" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sense indicar</SelectItem>
                    {stages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="student-course">Curs</FieldLabel>
                <Select value={courseId} disabled={!stage?.courses.length} onValueChange={(value) => {
                  setCourseId(value ?? "");
                  setValue("groupId", "");
                }} items={{ "": "Tria el curs", ...Object.fromEntries((stage?.courses ?? []).map((item) => [item.id, item.name])) }}>
                  <SelectTrigger id="student-course" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tria el curs</SelectItem>
                    {stage?.courses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errors.groupId)}>
                <FieldLabel htmlFor="student-group">Grup (opcional)</FieldLabel>
                <Controller control={control} name="groupId" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value ?? "")} disabled={!course?.groups.length}
                    items={{ "": "Sense indicar", ...Object.fromEntries((course?.groups ?? []).map((item) => [item.id, item.name])) }}>
                    <SelectTrigger id="student-group" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sense indicar</SelectItem>
                      {course?.groups.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                <FieldError errors={errors.groupId ? [errors.groupId] : undefined} />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              {!stages.length ? "La coordinació encara no ha definit les etapes, els cursos i els grups a «Aules i espais»."
                : stage && !stage.courses.length ? "Aquesta etapa encara no té cursos. Demana a la coordinació que els afegeixi."
                : course && !course.groups.length ? "Aquest curs encara no té grups. Demana a la coordinació que els afegeixi."
                : "Tria l'etapa, el curs i el grup. Ajuda la coordinació a saber a qui reclamar l'equip a final de curs."}
            </p>

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
