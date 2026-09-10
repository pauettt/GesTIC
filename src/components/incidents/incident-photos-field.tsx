"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { CameraIcon, ImageIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const MAX_PHOTOS = 2;

/**
 * Imatges del problema mentre s'omple el formulari.
 *
 * En mode "photo", `capture="environment"` fa que al mòbil s'obri directament
 * la càmera del darrere: el cas real és un professor dret davant del projector
 * espatllat. En mode "screenshot" (entorn Google) no s'hi posa, perquè la
 * imatge útil és una captura que ja té desada, no una foto nova.
 */
export function IncidentPhotosField({
  value,
  onChange,
  mode = "photo",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  mode?: "photo" | "screenshot";
}) {
  const isScreenshot = mode === "screenshot";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS - value.length);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map((file) =>
          upload(file.name, file, { access: "public", handleUploadUrl: "/api/blob/upload" }),
        ),
      );
      onChange([...value, ...uploaded.map((blob) => blob.url)]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      const what = isScreenshot ? "la captura" : "la foto";
      toast.error(detail ? `No s'ha pogut pujar ${what}: ${detail}` : `No s'ha pogut pujar ${what}`);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((url, index) => (
          <div key={url} className="relative size-20 overflow-hidden rounded-md border">
            <Image
              src={url}
              alt={`${isScreenshot ? "Captura" : "Foto"} ${index + 1}`}
              fill
              sizes="80px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== url))}
              aria-label={`Treu ${isScreenshot ? "la captura" : "la foto"} ${index + 1}`}
              className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 hover:bg-background"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < MAX_PHOTOS && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture={isScreenshot ? undefined : "environment"}
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isScreenshot ? <ImageIcon className="size-4" /> : <CameraIcon className="size-4" />}
              {isUploading
                ? "Pujant…"
                : value.length > 0
                  ? "Afegeix-ne una altra"
                  : isScreenshot
                    ? "Adjunta una captura"
                    : "Fes una foto"}
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Opcional. {isScreenshot ? "Una captura del que veus" : "Una foto del problema"} ajuda molt la
        coordinació TIC (màxim {MAX_PHOTOS}).
      </p>
    </div>
  );
}
