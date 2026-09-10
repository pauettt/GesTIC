"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertChromebook } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import {
  upsertChromebookSchema,
  type UpsertChromebookInput,
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

export function ChromebookDialog({
  cartId,
  chromebook,
  trigger,
}: {
  cartId: string;
  chromebook?: UpsertChromebookInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertChromebookInput>({
    resolver: zodResolver(upsertChromebookSchema),
    defaultValues: chromebook ?? {
      cartId,
      assetTag: "",
      serialNumber: "",
      brand: "",
      model: "",
    },
  });

  const { run, isPending } = useServerAction(upsertChromebook, {
    successMessage: chromebook ? "Chromebook actualitzat" : "Chromebook afegit",
    onSuccess: () => {
      setOpen(false);
      reset({ cartId, assetTag: "", serialNumber: "", brand: "", model: "" });
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
              Nou Chromebook
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chromebook ? "Edita el Chromebook" : "Nou Chromebook"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.assetTag)}>
              <FieldLabel htmlFor="assetTag">Identificador</FieldLabel>
              <Input id="assetTag" placeholder="Ex: CB-014" {...register("assetTag")} />
              <FieldError errors={errors.assetTag ? [errors.assetTag] : undefined} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="brand">Marca</FieldLabel>
                <Input id="brand" placeholder="Ex: Acer" {...register("brand")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="model">Model</FieldLabel>
                <Input id="model" placeholder="Ex: Chromebook Spin 511" {...register("model")} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="serialNumber">Número de sèrie</FieldLabel>
              <Input id="serialNumber" {...register("serialNumber")} />
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
