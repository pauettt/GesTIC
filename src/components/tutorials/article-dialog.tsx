"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertTutorialArticle } from "@/actions/tutorials";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import {
  upsertTutorialArticleSchema,
  type UpsertTutorialArticleInput,
} from "@/lib/validations/tutorials";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Category = { id: string; name: string };

export function ArticleDialog({
  categories,
  article,
  trigger,
}: {
  categories: Category[];
  article?: UpsertTutorialArticleInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertTutorialArticleInput>({
    resolver: zodResolver(upsertTutorialArticleSchema),
    defaultValues: article ?? {
      categoryId: categories[0]?.id ?? "",
      title: "",
      contentMarkdown: "",
    },
  });

  const { run, isPending } = useServerAction(upsertTutorialArticle, {
    successMessage: article ? "Tutorial actualitzat" : "Tutorial creat",
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
              Nou tutorial
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? "Edita el tutorial" : "Nou tutorial"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
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
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="title">Títol</FieldLabel>
              <Input id="title" {...register("title")} />
              <FieldError errors={errors.title ? [errors.title] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.contentMarkdown)}>
              <FieldLabel htmlFor="contentMarkdown">Contingut</FieldLabel>
              <Textarea id="contentMarkdown" rows={12} className="font-mono text-sm" {...register("contentMarkdown")} />
              <FieldDescription>Admet format Markdown (títols, llistes, enllaços…).</FieldDescription>
              <FieldError errors={errors.contentMarkdown ? [errors.contentMarkdown] : undefined} />
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
