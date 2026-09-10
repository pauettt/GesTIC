"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoinsIcon } from "lucide-react";

import { createLoanRequest } from "@/actions/loans";
import { useServerAction } from "@/hooks/use-server-action";
import { createLoanRequestSchema, type CreateLoanRequestInput } from "@/lib/validations/loans";
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
import { Textarea } from "@/components/ui/textarea";

export function LoanRequestDialog({ itemId, itemLabel }: { itemId: string; itemLabel: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLoanRequestInput>({
    resolver: zodResolver(createLoanRequestSchema),
    defaultValues: { itemId, startDate: "", endDate: "", purpose: "" },
  });

  const { run, isPending } = useServerAction(createLoanRequest, {
    successMessage: "Sol·licitud de préstec enviada",
    onSuccess: () => {
      setOpen(false);
      reset();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <HandCoinsIcon className="size-4" />
            Sol·licita préstec
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sol·licita préstec — {itemLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run({ ...values, itemId }))}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.startDate)}>
                <FieldLabel htmlFor="startDate">Des de</FieldLabel>
                <Input id="startDate" type="date" {...register("startDate")} />
                <FieldError errors={errors.startDate ? [errors.startDate] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.endDate)}>
                <FieldLabel htmlFor="endDate">Fins a</FieldLabel>
                <Input id="endDate" type="date" {...register("endDate")} />
                <FieldError errors={errors.endDate ? [errors.endDate] : undefined} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="purpose">Motiu (opcional)</FieldLabel>
              <Textarea id="purpose" rows={3} {...register("purpose")} />
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
