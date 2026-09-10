"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      onChange(blob.url);
    } catch (error) {
      // Mostrem el detall: aquest camp només el fa servir el coordinador i, quan
      // falla, sol ser per configuració (falta el token del blob store), no pas
      // pel fitxer triat.
      const detail = error instanceof Error ? error.message : "";
      toast.error(detail ? `No s'ha pogut pujar la imatge: ${detail}` : "No s'ha pogut pujar la imatge");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {value ? (
          <Image src={value} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <ImagePlusIcon className="size-6 text-muted-foreground" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Pujant…" : value ? "Canvia la imatge" : "Afegeix una imatge"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <XIcon className="size-4" />
            Treu-la
          </Button>
        )}
      </div>
    </div>
  );
}
