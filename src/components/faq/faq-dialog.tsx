"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { upsertFaq } from "@/actions/faq";
import { useServerAction } from "@/hooks/use-server-action";
import { upsertFaqSchema, type UpsertFaqInput } from "@/lib/validations/faq";
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

export function FaqDialog({
  faq,
  trigger,
}: {
  faq?: UpsertFaqInput;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertFaqInput>({
    resolver: zodResolver(upsertFaqSchema),
    defaultValues: faq ?? { question: "", answer: "", category: "General", order: "" },
  });

  const { run, isPending } = useServerAction(upsertFaq, {
    successMessage: faq ? "Pregunta actualitzada" : "Pregunta afegida",
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
              Nova pregunta
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{faq ? "Edita la pregunta" : "Nova pregunta freqüent"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.category)}>
              <FieldLabel htmlFor="category">Categoria</FieldLabel>
              <Input id="category" {...register("category")} />
              <FieldError errors={errors.category ? [errors.category] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.question)}>
              <FieldLabel htmlFor="question">Pregunta</FieldLabel>
              <Input id="question" {...register("question")} />
              <FieldError errors={errors.question ? [errors.question] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.answer)}>
              <FieldLabel htmlFor="answer">Resposta</FieldLabel>
              <Textarea id="answer" rows={4} {...register("answer")} />
              <FieldError errors={errors.answer ? [errors.answer] : undefined} />
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
