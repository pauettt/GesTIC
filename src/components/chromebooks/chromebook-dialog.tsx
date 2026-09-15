"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertChromebook } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { DEVICE_TYPES, deviceTypeLabels } from "@/lib/devices";
import { toSelectItems } from "@/lib/utils";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CartOption = { id: string; name: string };

function emptyDevice(cartId: string): UpsertChromebookInput {
  return { cartId, deviceType: "CHROMEBOOK", assetTag: "", serialNumber: "", brand: "", model: "" };
}

export function ChromebookDialog({
  cartId,
  carts,
  chromebook,
  trigger,
}: {
  cartId: string;
  /** Carros on es pot moure l'equip en editar-lo. */
  carts: CartOption[];
  chromebook?: UpsertChromebookInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertChromebookInput>({
    resolver: zodResolver(upsertChromebookSchema),
    defaultValues: chromebook ?? emptyDevice(cartId),
  });

  const { run, isPending } = useServerAction(upsertChromebook, {
    successMessage: chromebook ? "Dispositiu actualitzat" : "Dispositiu afegit",
    onSuccess: () => {
      setOpen(false);
      if (!chromebook) reset(emptyDevice(cartId));
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
              Nou dispositiu
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chromebook ? "Edita el dispositiu" : "Nou dispositiu"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.deviceType)}>
                <FieldLabel htmlFor="deviceType">Tipus</FieldLabel>
                <Controller
                  control={control}
                  name="deviceType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} items={deviceTypeLabels}>
                      <SelectTrigger id="deviceType" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {deviceTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={errors.deviceType ? [errors.deviceType] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.assetTag)}>
                <FieldLabel htmlFor="assetTag">Identificador</FieldLabel>
                <Input id="assetTag" placeholder="Ex: C1-14" {...register("assetTag")} />
                <FieldError errors={errors.assetTag ? [errors.assetTag] : undefined} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="brand">Marca</FieldLabel>
                <Input id="brand" placeholder="Ex: Acer" {...register("brand")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="model">Model</FieldLabel>
                <Input id="model" placeholder="Ex: Spin 511" {...register("model")} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="serialNumber">Número de sèrie</FieldLabel>
              <Input id="serialNumber" {...register("serialNumber")} />
            </Field>
            {chromebook && (
              <Field data-invalid={Boolean(errors.cartId)}>
                <FieldLabel htmlFor="cartId">Carro</FieldLabel>
                <Controller
                  control={control}
                  name="cartId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={toSelectItems(carts, (c) => c.id, (c) => c.name)}
                    >
                      <SelectTrigger id="cartId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {carts.map((cart) => (
                          <SelectItem key={cart.id} value={cart.id}>
                            {cart.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={errors.cartId ? [errors.cartId] : undefined} />
              </Field>
            )}
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
