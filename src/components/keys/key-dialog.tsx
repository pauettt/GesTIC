"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertKey } from "@/actions/keys";
import { useServerAction } from "@/hooks/use-server-action";
import { upsertKeySchema, type UpsertKeyInput } from "@/lib/validations/keys";
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

const NO_CART = "cap";

export function KeyDialog({
  entry,
  carts,
  trigger,
}: {
  entry?: UpsertKeyInput;
  carts: { id: string; name: string }[];
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertKeyInput>({
    resolver: zodResolver(upsertKeySchema),
    defaultValues: entry ?? { number: "", name: "", cartId: "", copies: 2, notes: "" },
  });

  const { run, isPending } = useServerAction(upsertKey, {
    successMessage: entry ? "Clau actualitzada" : "Clau creada",
    onSuccess: () => {
      setOpen(false);
      if (!entry) reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon className="size-4" />
              Nova clau
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edita la clau" : "Nova clau"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.number)}>
              <FieldLabel htmlFor="key-number">Número</FieldLabel>
              <Input id="key-number" placeholder="A-14" {...register("number")} />
              <FieldError errors={errors.number ? [errors.number] : undefined} />
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="key-name">A què obre</FieldLabel>
              <Input id="key-name" placeholder="Aula 2.03, magatzem TIC…" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="key-cart">Carro de Chromebooks</FieldLabel>
              <Controller
                control={control}
                name="cartId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_CART}
                    onValueChange={(v) => field.onChange(v === NO_CART ? "" : (v ?? ""))}
                    items={{
                      [NO_CART]: "Cap — és una clau d'aula o magatzem",
                      ...Object.fromEntries(carts.map((c) => [c.id, c.name])),
                    }}
                  >
                    <SelectTrigger id="key-cart" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CART}>Cap — és una clau d&apos;aula o magatzem</SelectItem>
                      {carts.map((cart) => (
                        <SelectItem key={cart.id} value={cart.id}>
                          {cart.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Si la lligues a un carro, la pantalla sabrà a quina hora s&apos;havia de tornar a
                partir de la reserva.
              </p>
            </Field>

            <Field data-invalid={Boolean(errors.copies)}>
              <FieldLabel htmlFor="key-copies">Còpies</FieldLabel>
              <Input
                id="key-copies"
                type="number"
                min={1}
                max={10}
                {...register("copies", { valueAsNumber: true })}
              />
              <FieldError errors={errors.copies ? [errors.copies] : undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="key-notes">Notes</FieldLabel>
              <Input id="key-notes" {...register("notes")} />
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
