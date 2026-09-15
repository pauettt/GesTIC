"use client";

import { useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, PlusIcon, WandSparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { revealCredential, upsertCredential } from "@/actions/credentials";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import { upsertCredentialSchema, type UpsertCredentialInput } from "@/lib/validations/credentials";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Category = { id: string; name: string };
type Credential = {
  id: string;
  categoryId: string;
  name: string;
  username: string | null;
  url: string | null;
  superAdminOnly: boolean;
};

/** Sense caràcters que es confonen en llegir-los en veu alta o en paper (l/1, O/0). */
const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_.!";

function generatePassword(length = 16) {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join("");
}

function formValues(categories: Category[], credential?: Credential): UpsertCredentialInput {
  return {
    id: credential?.id,
    categoryId: credential?.categoryId ?? categories[0]?.id ?? "",
    name: credential?.name ?? "",
    username: credential?.username ?? "",
    password: "",
    url: credential?.url ?? "",
    notes: "",
    superAdminOnly: credential?.superAdminOnly ?? false,
  };
}

export function CredentialDialog({
  categories,
  credential,
  canRestrict,
  trigger,
}: {
  categories: Category[];
  credential?: Credential;
  canRestrict: boolean;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UpsertCredentialInput>({
    resolver: zodResolver(upsertCredentialSchema),
    defaultValues: formValues(categories),
  });

  const { run, isPending } = useServerAction(upsertCredential, {
    successMessage: credential ? "Contrasenya actualitzada" : "Contrasenya desada",
    onSuccess: () => handleOpenChange(false),
  });

  async function loadSecret(id: string) {
    setIsLoadingSecret(true);
    try {
      const result = await revealCredential({ id, purpose: "edit" });
      if (result.success) {
        setValue("password", result.password);
        setValue("notes", result.notes);
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    } catch (error) {
      unstable_rethrow(error);
      toast.error("No s'ha pogut obrir la contrasenya per editar-la.");
      setOpen(false);
    } finally {
      setIsLoadingSecret(false);
    }
  }

  function handleOpenChange(next: boolean) {
    // En obrir, amb les dades d'ara; en tancar, el formulari no es queda la contrasenya.
    reset(formValues(categories, credential));
    setShowPassword(false);
    setOpen(next);
    if (next && credential) void loadSecret(credential.id);
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
              Afegeix
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{credential ? `Edita «${credential.name}»` : "Nova contrasenya"}</DialogTitle>
          <DialogDescription>Es desa xifrada. Cada cop que algú la consulta queda apuntat.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))} autoComplete="off">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="credential-name">De què és</FieldLabel>
              <Input id="credential-name" placeholder="Impressora de consergeria" {...register("name")} />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.categoryId)}>
              <FieldLabel htmlFor="credential-category">Categoria</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={toSelectItems(categories, (c) => c.id, (c) => c.name)}
                  >
                    <SelectTrigger id="credential-category" className="w-full">
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
            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor="credential-username">Usuari</FieldLabel>
              <Input id="credential-username" autoComplete="off" {...register("username")} />
              <FieldError errors={errors.username ? [errors.username] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="credential-password">Contrasenya</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="credential-password"
                  type={showPassword ? "text" : "password"}
                  // Que el navegador no hi posi la contrasenya de qui està editant.
                  autoComplete="new-password"
                  className="font-mono"
                  disabled={isLoadingSecret}
                  placeholder={isLoadingSecret ? "Carregant…" : undefined}
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showPassword ? "Amaga la contrasenya" : "Mostra la contrasenya"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Genera una contrasenya segura"
                  title="Genera una contrasenya segura"
                  onClick={() => {
                    setValue("password", generatePassword(), { shouldDirty: true });
                    setShowPassword(true);
                  }}
                >
                  <WandSparklesIcon className="size-4" />
                </Button>
              </div>
              <FieldError errors={errors.password ? [errors.password] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.url)}>
              <FieldLabel htmlFor="credential-url">Enllaç</FieldLabel>
              <Input id="credential-url" inputMode="url" placeholder="https://…" {...register("url")} />
              <FieldDescription>Opcional. On s&apos;entra amb aquest usuari.</FieldDescription>
              <FieldError errors={errors.url ? [errors.url] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.notes)}>
              <FieldLabel htmlFor="credential-notes">Observacions</FieldLabel>
              <Textarea id="credential-notes" rows={3} disabled={isLoadingSecret} {...register("notes")} />
              <FieldDescription>Es desen xifrades, com la contrasenya.</FieldDescription>
              <FieldError errors={errors.notes ? [errors.notes] : undefined} />
            </Field>
            {canRestrict && (
              <Controller
                control={control}
                name="superAdminOnly"
                render={({ field }) => (
                  <label className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} />
                    <span>
                      Només superadministrador
                      <span className="block text-xs text-muted-foreground">
                        La coordinació TIC no la veurà ni sabrà que existeix.
                      </span>
                    </span>
                  </label>
                )}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel·la
              </Button>
              <Button type="submit" disabled={isPending || isLoadingSecret}>
                {isPending ? "Desant…" : "Desa"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
