"use client";

import { useState } from "react";
import Link from "next/link";
import { HistoryIcon, LaptopIcon, PlusIcon } from "lucide-react";
import type { ChromebookStatus } from "@prisma/client";

import { addChromebookNote, deleteChromebook, deleteChromebookNote } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDateTime } from "@/lib/date";
import { chromebookStatusLabels, chromebookStatusSquareClasses } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChromebookDialog } from "@/components/chromebooks/chromebook-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Note = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string };
};

type Chromebook = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: ChromebookStatus;
  notes: Note[];
};

function ChromebookNoteForm({ chromebookId }: { chromebookId: string }) {
  const [body, setBody] = useState("");
  const { run, isPending } = useServerAction(addChromebookNote, {
    onSuccess: () => setBody(""),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        run({ chromebookId, body });
      }}
      className="flex flex-col gap-1.5"
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Afegeix una nota (avaria, reparació, seguiment…)"
        rows={2}
        className="text-xs"
      />
      <div className="flex justify-end">
        <Button type="submit" size="xs" disabled={isPending || !body.trim()}>
          {isPending ? "Afegint…" : "Afegeix nota"}
        </Button>
      </div>
    </form>
  );
}

export function ChromebookSquare({ cartId, chromebook }: { cartId: string; chromebook: Chromebook }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 text-center transition-colors",
              chromebookStatusSquareClasses[chromebook.status],
            )}
          />
        }
      >
        <LaptopIcon className="size-5" />
        <span className="line-clamp-1 text-[11px] font-semibold">{chromebook.assetTag}</span>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{chromebook.assetTag}</p>
            <Badge variant="outline">{chromebookStatusLabels[chromebook.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {[chromebook.brand, chromebook.model].filter(Boolean).join(" ") || "Sense marca/model"}
          </p>
          {chromebook.serialNumber && (
            <p className="text-xs text-muted-foreground">Núm. sèrie: {chromebook.serialNumber}</p>
          )}
          <Link
            href={`/incidencies?chromebookId=${chromebook.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <HistoryIcon className="size-3.5" />
            Veure historial d&apos;incidències
          </Link>
          <div className="flex justify-end gap-2">
            <ChromebookDialog
              cartId={cartId}
              chromebook={{
                id: chromebook.id,
                cartId,
                assetTag: chromebook.assetTag,
                serialNumber: chromebook.serialNumber ?? "",
                brand: chromebook.brand ?? "",
                model: chromebook.model ?? "",
              }}
              trigger={
                <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Edita</button>
              }
            />
            <ConfirmDeleteButton
              action={deleteChromebook}
              input={{ id: chromebook.id }}
              title="Eliminar aquest Chromebook?"
            />
          </div>

          <Separator />

          <p className="text-xs font-semibold text-muted-foreground">Historial de notes</p>
          <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
            {chromebook.notes.length === 0 && (
              <p className="text-xs text-muted-foreground">Encara no hi ha cap nota.</p>
            )}
            {chromebook.notes.map((note) => (
              <div key={note.id} className="rounded-md bg-muted p-1.5 text-xs">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p>{note.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {note.author.name ?? note.author.email} · {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                  <ConfirmDeleteButton
                    action={deleteChromebookNote}
                    input={{ id: note.id }}
                    title="Eliminar aquesta nota?"
                  />
                </div>
              </div>
            ))}
          </div>
          <ChromebookNoteForm chromebookId={chromebook.id} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AddChromebookSquare({ cartId }: { cartId: string }) {
  return (
    <ChromebookDialog
      cartId={cartId}
      trigger={
        <button
          type="button"
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <PlusIcon className="size-5" />
          <span className="text-[11px] font-semibold">Afegeix</span>
        </button>
      }
    />
  );
}
