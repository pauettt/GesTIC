"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createQuery } from "@/actions/queries";
import { useServerAction } from "@/hooks/use-server-action";
import { createQuerySchema, type CreateQueryInput } from "@/lib/validations/query";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function QueryForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateQueryInput>({
    resolver: zodResolver(createQuerySchema),
    defaultValues: { title: "", description: "" },
  });

  const { run, isPending } = useServerAction(createQuery);

  return (
    <form onSubmit={handleSubmit((values) => run(values))}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="query-title">De què tracta la teva consulta?</FieldLabel>
          <Input
            id="query-title"
            placeholder="Ex: Com comparteixo un document de Drive amb els alumnes?"
            {...register("title")}
          />
          <FieldError errors={errors.title ? [errors.title] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="query-description">Explica-ho amb més detall</FieldLabel>
          <Textarea
            id="query-description"
            rows={5}
            placeholder="Quina eina fas servir, què has provat i què esperaves que passés."
            {...register("description")}
          />
          <FieldError errors={errors.description ? [errors.description] : undefined} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel·la
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enviant…" : "Envia la consulta"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
