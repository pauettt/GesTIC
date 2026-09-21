"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";

import { createInventoryCategory, upsertInventoryItem } from "@/actions/inventory";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Space = { id: string; name: string };
type Category = { id: string; name: string };

/**
 * Amb `item`, edita aquell equip. Amb `copyFrom`, en crea un de nou que parteix
 * de les seves dades: de deu projectors iguals només canvia l'aula. El número de
 * sèrie, la IP i el nom a la xarxa són de cada equip i per això no es copien.
 */
export function InventoryItemDialog({
  spaces,
  categories,
  item,
  copyFrom,
  trigger,
}: {
  spaces: Space[];
  categories: Category[];
  item?: UpsertInventoryItemInput;
  copyFrom?: UpsertInventoryItemInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initialValues = (): UpsertInventoryItemInput =>
    item ??
    (copyFrom
      ? { ...copyFrom, id: undefined, serialNumber: "", ipAddress: "", hostname: "" }
      : {
          categoryId: categories[0]?.id ?? "",
          brand: "",
          model: "",
          serialNumber: "",
          ipAddress: "",
          hostname: "",
          spaceId: "",
          status: "ACTIU",
          imageUrl: "",
          isLoanable: false,
          purchaseDate: "",
          warrantyUntil: "",
          notes: "",
        });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertInventoryItemInput>({
    resolver: zodResolver(upsertInventoryItemSchema),
    defaultValues: initialValues(),
  });

  const { run, isPending } = useServerAction(upsertInventoryItem, {
    successMessage: item ? "Equip actualitzat" : "Equip afegit a l'inventari",
    onSuccess: () => {
      setOpen(false);
      reset();
    },
  });

  function handleOpenChange(next: boolean) {
    // Una còpia parteix de l'equip tal com és ara, no de com era en carregar la pàgina.
    if (next && copyFrom) reset(initialValues());
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edita l'equip" : copyFrom ? "Duplica l'equip" : "Nou equip d'inventari"}
          </DialogTitle>
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
                    <CategorySelect categories={categories} value={field.value} onChange={field.onChange} />
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

            {/* Per al material de xarxa: la secció «Xarxa» surt d'aquests dos camps. */}
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={Boolean(errors.ipAddress)}>
                <FieldLabel htmlFor="ipAddress">Adreça IP</FieldLabel>
                <Input id="ipAddress" inputMode="decimal" placeholder="10.1.2.30" {...register("ipAddress")} />
                <FieldError errors={errors.ipAddress ? [errors.ipAddress] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.hostname)}>
                <FieldLabel htmlFor="hostname">Nom a la xarxa</FieldLabel>
                <Input id="hostname" placeholder="A004-PC01" {...register("hostname")} />
                <FieldError errors={errors.hostname ? [errors.hostname] : undefined} />
              </Field>
            </div>

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

const NEW_CATEGORY = "__nova";

/**
 * La categoria de l'equip. Si no hi és, es crea des del mateix desplegable
 * («Nova categoria…») i queda triada, sense perdre el que ja s'ha omplert.
 */
function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  // Les creades aquí, fins que la pàgina les porti: la llista del servidor arriba després.
  const [created, setCreated] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const options = [...categories, ...created.filter((extra) => !categories.some((c) => c.id === extra.id))];

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        const result = await createInventoryCategory({ name });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setCreated((current) => [...current, result.category]);
        onChange(result.category.id);
        setCreating(false);
        setName("");
        toast.success("Categoria creada");
      } catch (error) {
        unstable_rethrow(error);
        toast.error("No s'ha pogut crear la categoria. Comprova la connexió i torna-ho a provar.");
      }
    });
  }

  if (creating) {
    return (
      <div className="flex gap-1">
        <Input
          id="categoryId"
          autoFocus
          value={name}
          placeholder="Nova categoria"
          aria-label="Nom de la nova categoria"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            // Enter crearia l'equip, no la categoria.
            if (event.key === "Enter") {
              event.preventDefault();
              create();
            }
            if (event.key === "Escape") {
              event.stopPropagation();
              setCreating(false);
            }
          }}
        />
        <Button type="button" size="sm" className="h-8" onClick={create} disabled={isPending || !name.trim()}>
          Crea
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setCreating(false)}>
          <XIcon className="size-4" />
          <span className="sr-only">Cancel·la</span>
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === NEW_CATEGORY) setCreating(true);
        else if (next) onChange(next);
      }}
      items={{ ...toSelectItems(options, (c) => c.id, (c) => c.name), [NEW_CATEGORY]: "Nova categoria…" }}
    >
      <SelectTrigger id="categoryId" className="w-full">
        <SelectValue placeholder="Selecciona una categoria" />
      </SelectTrigger>
      <SelectContent>
        {options.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NEW_CATEGORY}>
          <PlusIcon className="size-4" />
          Nova categoria…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
