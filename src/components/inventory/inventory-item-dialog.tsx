"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertInventoryItem } from "@/actions/inventory";
import { useServerAction } from "@/hooks/use-server-action";
import { inventoryItemStatusLabels } from "@/lib/labels";
import { toSelectItems } from "@/lib/utils";
import {
  upsertInventoryItemSchema,
  type UpsertInventoryItemInput,
} from "@/lib/validations/inventory";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
type Category = { id: string; name: string };

export function InventoryItemDialog({
  spaces,
  categories,
  item,
  trigger,
}: {
  spaces: Space[];
  categories: Category[];
  item?: UpsertInventoryItemInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertInventoryItemInput>({
    resolver: zodResolver(upsertInventoryItemSchema),
    defaultValues: item ?? {
      categoryId: categories[0]?.id ?? "",
      brand: "",
      model: "",
      serialNumber: "",
      spaceId: "",
      status: "ACTIU",
      imageUrl: "",
      isLoanable: false,
      purchaseDate: "",
      warrantyUntil: "",
      notes: "",
    },
  });

  const { run, isPending } = useServerAction(upsertInventoryItem, {
    successMessage: item ? "Equip actualitzat" : "Equip afegit a l'inventari",
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
              Nou equip
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edita l'equip" : "Nou equip d'inventari"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.categoryId)}>
                <FieldLabel htmlFor="categoryId">Categoria</FieldLabel>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={toSelectItems(categories, (c) => c.id, (c) => c.name)}
                    >
                      <SelectTrigger id="categoryId" className="w-full">
                        <SelectValue placeholder="Selecciona una categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={errors.categoryId ? [errors.categoryId] : undefined} />
              </Field>
              <Field>
                <FieldLabel htmlFor="status">Estat</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} items={inventoryItemStatusLabels}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(inventoryItemStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.brand)}>
                <FieldLabel htmlFor="brand">Marca</FieldLabel>
                <Input id="brand" {...register("brand")} />
                <FieldError errors={errors.brand ? [errors.brand] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.model)}>
                <FieldLabel htmlFor="model">Model</FieldLabel>
                <Input id="model" {...register("model")} />
                <FieldError errors={errors.model ? [errors.model] : undefined} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="serialNumber">Número de sèrie</FieldLabel>
              <Input id="serialNumber" {...register("serialNumber")} />
            </Field>

            <Field>
              <FieldLabel htmlFor="spaceId">Ubicació</FieldLabel>
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
              <FieldLabel>Imatge</FieldLabel>
              <Controller
                control={control}
                name="imageUrl"
                render={({ field }) => (
                  <ImageUploadField value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
            </Field>

            <Controller
              control={control}
              name="isLoanable"
              render={({ field }) => (
                <label className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                  />
                  <span>
                    Prestable al professorat
                    <span className="block text-xs text-muted-foreground">
                      Es podrà demanar en préstec (ex: portàtils, iPads). Desmarca-ho per a material
                      fix de l&apos;aula.
                    </span>
                  </span>
                </label>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="purchaseDate">Data de compra</FieldLabel>
                <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="warrantyUntil">Garantia fins</FieldLabel>
                <Input id="warrantyUntil" type="date" {...register("warrantyUntil")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={3} {...register("notes")} />
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
