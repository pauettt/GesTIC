"use client";

import { useState } from "react";
import Link from "next/link";
import { HistoryIcon, LaptopIcon, PlusIcon } from "lucide-react";
import type { ChromebookStatus } from "@prisma/client";

import {
  addChromebookNote,
  deleteChromebook,
  deleteChromebookNote,
  setChromebookAvailability,
} from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDateTime } from "@/lib/date";
import {
  chromebookStatusLabels,
  chromebookStatusSquareClasses,
  chromebookStatusVariants,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChromebookDialog, type CartOption } from "@/components/chromebooks/chromebook-dialog";
import { RetireChromebookButton } from "@/components/chromebooks/retire-chromebook-button";
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
  unavailableReason: string | null;
  notes: Note[];
};

/** Per què no es pot canviar a mà: aquests estats surten dels fets. */
const DERIVED_STATUS_HINTS: Partial<Record<ChromebookStatus, string>> = {
  EN_INCIDENCIA: "Torna a estar disponible quan es resolguin les incidències obertes.",
  ASSIGNAT: "El té un alumne: torna a estar disponible quan se'n registri la devolució.",
  BAIXA: "Per tornar-lo a fer servir, torna'l a activar.",
};

/**
 * Disponible o no disponible, a mà. En marcar-lo com a no disponible es demana
 * el motiu, que queda a les notes; tornar-lo a posar disponible és un clic.
 */
function ChromebookAvailability({ chromebook }: { chromebook: Chromebook }) {
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");
  const unavailable = chromebook.status === "NO_DISPONIBLE";

  const { run, isPending } = useServerAction(setChromebookAvailability, {
    successMessage: unavailable ? "Chromebook disponible" : "Chromebook marcat com a no disponible",
    onSuccess: () => {
      setAskingReason(false);
      setReason("");
    },
  });

  const hint = DERIVED_STATUS_HINTS[chromebook.status];
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>;

  const showsUnavailable = unavailable || askingReason;
  const option = "rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Disponibilitat">
        <button
          type="button"
          role="radio"
          aria-checked={!showsUnavailable}
          disabled={isPending}
          onClick={() => {
            setAskingReason(false);
            if (unavailable) run({ id: chromebook.id, available: true });
          }}
          className={cn(
            option,
            !showsUnavailable ? "bg-background text-green-700 shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Disponible
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={showsUnavailable}
          disabled={isPending}
          onClick={() => {
            setReason(chromebook.unavailableReason ?? "");
            setAskingReason(true);
          }}
          className={cn(
            option,
            showsUnavailable ? "bg-background text-red-700 shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          No disponible
        </button>
      </div>

      {unavailable && !askingReason && chromebook.unavailableReason && (
        <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">Motiu: {chromebook.unavailableReason}</p>
      )}

      {askingReason && (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            run({ id: chromebook.id, available: false, reason });
          }}
        >
          <Textarea
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Per què no està disponible? El professorat veurà el motiu (falta el carregador…)"
            maxLength={200}
            rows={2}
            className="text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" size="xs" variant="ghost" onClick={() => setAskingReason(false)}>
              Cancel·la
            </Button>
            <Button type="submit" size="xs" variant="destructive" disabled={isPending || reason.trim().length < 3}>
              {unavailable ? "Desa el motiu" : "Marca com a no disponible"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

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

export function ChromebookSquare({
  cartId,
  carts,
  chromebook,
}: {
  cartId: string;
  carts: CartOption[];
  chromebook: Chromebook;
}) {
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
            <Badge variant={chromebookStatusVariants[chromebook.status]}>
              {chromebookStatusLabels[chromebook.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {[chromebook.brand, chromebook.model].filter(Boolean).join(" ") || "Sense marca/model"}
          </p>
          {chromebook.serialNumber && (
            <p className="text-xs text-muted-foreground">Núm. sèrie: {chromebook.serialNumber}</p>
          )}
          <ChromebookAvailability chromebook={chromebook} />
          <Link
            href={`/incidencies?chromebookId=${chromebook.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <HistoryIcon className="size-3.5" />
            Veure historial d&apos;incidències
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <RetireChromebookButton
              chromebookId={chromebook.id}
              retired={chromebook.status === "BAIXA"}
            />
            <ChromebookDialog
              cartId={cartId}
              carts={carts}
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
              description="Es perden també les seves notes, i les incidències queden sense equip. Si només ha deixat de funcionar, dona'l de baixa: així se'n conserva l'historial."
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

export function AddChromebookSquare({ cartId, carts }: { cartId: string; carts: CartOption[] }) {
  return (
    <ChromebookDialog
      cartId={cartId}
      carts={carts}
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
