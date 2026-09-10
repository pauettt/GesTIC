"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertCart } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import { upsertCartSchema, type UpsertCartInput } from "@/lib/validations/chromebooks";
import { ImageUploadField } from "@/components/shared/image-upload-field";
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

type Space = { id: string; name: string };

export function CartDialog({
  spaces,
  cart,
  trigger,
}: {
  spaces: Space[];
  cart?: UpsertCartInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertCartInput>({
    resolver: zodResolver(upsertCartSchema),
    defaultValues: cart ?? { name: "", serialNumber: "", spaceId: "", imageUrl: "" },
  });

  const { run, isPending } = useServerAction(upsertCart, {
    successMessage: cart ? "Carro actualitzat" : "Carro creat",
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
              Nou carro
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cart ? "Edita el carro" : "Nou carro de Chromebooks"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="cart-name">Nom del carro</FieldLabel>
              <Input id="cart-name" placeholder="Ex: Carro 1 - Primària" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cart-serial">Número de sèrie</FieldLabel>
              <Input id="cart-serial" {...register("serialNumber")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cart-space">Ubicació habitual</FieldLabel>
              <Controller
                control={control}
                name="spaceId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={toSelectItems(spaces, (s) => s.id, (s) => s.name)}
                  >
                    <SelectTrigger id="cart-space" className="w-full">
                      <SelectValue placeholder="Sense ubicació" />
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
              <FieldLabel>Foto del carro</FieldLabel>
              <Controller
                control={control}
                name="imageUrl"
                render={({ field }) => (
                  <ImageUploadField value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
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
