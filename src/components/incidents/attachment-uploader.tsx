"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { PaperclipIcon } from "lucide-react";
import { toast } from "sonner";

import { attachIncidentFile } from "@/actions/incidents";
import { Button } from "@/components/ui/button";

export function AttachmentUploader({ incidentId }: { incidentId: string }) {
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
      const result = await attachIncidentFile({
        incidentId,
        url: blob.url,
        filename: file.name,
      });
      if (result.success) {
        toast.success("Fitxer adjuntat");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      toast.error(detail ? `No s'ha pogut pujar el fitxer: ${detail}` : "No s'ha pogut pujar el fitxer");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon className="size-4" />
        {isUploading ? "Pujant…" : "Adjunta una foto"}
      </Button>
    </div>
  );
}
