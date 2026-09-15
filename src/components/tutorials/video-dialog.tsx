"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { unstable_rethrow } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { lookupTutorialVideo, upsertTutorialVideo } from "@/actions/tutorials";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import {
  upsertTutorialVideoSchema,
  type UpsertTutorialVideoInput,
} from "@/lib/validations/tutorials";
import { parseYoutubeId, youtubeThumbnailUrl, youtubeWatchUrl } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
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
type Video = { id: string; categoryId: string; youtubeId: string; title: string; description: string | null };
type LookedUp = { youtubeId: string; title: string };

function formValues(categories: Category[], video?: Video): UpsertTutorialVideoInput {
  return video
    ? {
        id: video.id,
        categoryId: video.categoryId,
        url: youtubeWatchUrl(video.youtubeId),
        title: video.title,
        description: video.description ?? "",
      }
    : { categoryId: categories[0]?.id ?? "", url: "", title: "", description: "" };
}

export function VideoDialog({
  categories,
  video,
  trigger,
}: {
  categories: Category[];
  video?: Video;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // L'últim vídeo trobat a YouTube: evita repetir la consulta i diu si el títol
  // encara és el que hi va posar YouTube o ja s'ha escrit a mà.
  const [lookedUp, setLookedUp] = useState<LookedUp | null>(null);
  const [isLookingUp, startLookup] = useTransition();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<UpsertTutorialVideoInput>({
    resolver: zodResolver(upsertTutorialVideoSchema),
    defaultValues: formValues(categories, video),
  });
  const youtubeId = parseYoutubeId(useWatch({ control, name: "url" }) ?? "");

  const { run, isPending } = useServerAction(upsertTutorialVideo, {
    successMessage: video ? "Vídeo actualitzat" : "Vídeo afegit",
    onSuccess: () => setOpen(false),
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      // Cada cop que s'obre, amb les dades d'ara: si ja s'havia editat, la
      // pàgina porta els valors nous.
      reset(formValues(categories, video));
      setLookedUp(video ? { youtubeId: video.youtubeId, title: video.title } : null);
    }
    setOpen(next);
  }

  function lookUp(url: string) {
    const id = parseYoutubeId(url);
    if (!id || id === lookedUp?.youtubeId) return;
    const previousTitle = lookedUp?.title;

    startLookup(async () => {
      try {
        const result = await lookupTutorialVideo(url);
        // Si mentrestant s'ha enganxat un altre enllaç, aquesta resposta ja no val.
        if (parseYoutubeId(getValues("url")) !== id) return;
        if (!result.success) {
          setError("url", { message: result.error });
          return;
        }
        clearErrors("url");
        const title = getValues("title").trim();
        if (!title || title === previousTitle) {
          setValue("title", result.title, { shouldValidate: true });
        }
        setLookedUp({ youtubeId: id, title: result.title });
      } catch (error) {
        unstable_rethrow(error);
        setError("url", { message: "No s'ha pogut consultar YouTube. Torna-ho a provar." });
      }
    });
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
              Afegeix un vídeo
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{video ? "Edita el vídeo" : "Afegeix un vídeo"}</DialogTitle>
          <DialogDescription>Enganxa l&apos;enllaç del vídeo de YouTube i el títol s&apos;omple sol.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.url)}>
              <FieldLabel htmlFor="video-url">Enllaç de YouTube</FieldLabel>
              <Input
                id="video-url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.youtube.com/watch?v=…"
                {...register("url", { onChange: (event) => lookUp(event.target.value) })}
              />
              {isLookingUp && <FieldDescription>Buscant el vídeo a YouTube…</FieldDescription>}
              <FieldError errors={errors.url ? [errors.url] : undefined} />
              {youtubeId && lookedUp?.youtubeId === youtubeId && !errors.url && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                  <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={youtubeThumbnailUrl(youtubeId)} alt="" fill sizes="112px" className="object-cover" />
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{lookedUp.title}</span>
                </div>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="video-title">Títol</FieldLabel>
              <Input id="video-title" {...register("title")} />
              <FieldError errors={errors.title ? [errors.title] : undefined} />
            </Field>
            <Field data-invalid={Boolean(errors.categoryId)}>
              <FieldLabel htmlFor="video-category">Categoria</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={toSelectItems(categories, (c) => c.id, (c) => c.name)}
                  >
                    <SelectTrigger id="video-category" className="w-full">
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
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="video-description">Descripció</FieldLabel>
              <Textarea id="video-description" rows={3} {...register("description")} />
              <FieldDescription>Opcional. Una frase que ajudi a saber si és el vídeo que es busca.</FieldDescription>
              <FieldError errors={errors.description ? [errors.description] : undefined} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel·la
              </Button>
              <Button type="submit" disabled={isPending || isLookingUp}>
                {isPending ? "Desant…" : "Desa"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
