"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from "lucide-react";

import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ActionResult = { success: true } | { success: false; error: string };

export type ManagedCategory = {
  id: string;
  name: string;
  order: number;
  /** Quantes coses hi ha assignades. Decideix si es pot eliminar i què s'avisa. */
  usageCount: number;
};

export function CategoryManagerDialog({
  categories,
  upsertAction,
  deleteAction,
  reorderAction,
  title,
  description,
  itemNounSingular,
  itemNounPlural,
  deleteCascades = false,
  triggerLabel = "Categories",
  triggerVariant = "ghost",
}: {
  categories: ManagedCategory[];
  upsertAction: (input: { id?: string; name: string; order?: string }) => Promise<ActionResult>;
  deleteAction: (input: { id: string }) => Promise<ActionResult>;
  reorderAction: (input: { id: string; direction: "up" | "down" }) => Promise<ActionResult>;
  title: string;
  description: string;
  itemNounSingular: string;
  itemNounPlural: string;
  /**
   * Si eliminar la categoria arrossega el seu contingut (onDelete: Cascade),
   * avisem de quantes coses cauran. Si no (onDelete: Restrict), bloquegem
   * l'eliminació abans de demanar-la: així l'error del servidor no arriba mai.
   */
  deleteCascades?: boolean;
  triggerLabel?: string;
  triggerVariant?: "ghost" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function usageText(count: number) {
    return `${count} ${count === 1 ? itemNounSingular : itemNounPlural}`;
  }

  const create = useServerAction(upsertAction, {
    successMessage: "Categoria creada",
    onSuccess: () => setNewName(""),
  });
  const rename = useServerAction(upsertAction, {
    successMessage: "Categoria actualitzada",
    onSuccess: () => setEditingId(null),
  });
  const remove = useServerAction(deleteAction, {
    successMessage: "Categoria eliminada",
    onSuccess: () => setConfirmingId(null),
  });
  // Reordenar no porta missatge: el moviment ja és la confirmació visible.
  const move = useServerAction(reorderAction);

  const busy = create.isPending || rename.isPending || remove.isPending || move.isPending;

  function startEditing(category: ManagedCategory) {
    setConfirmingId(null);
    setEditingId(category.id);
    setDraftName(category.name);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEditingId(null);
          setConfirmingId(null);
          setNewName("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size="sm">
            <SlidersHorizontalIcon className="size-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] divide-y overflow-y-auto rounded-lg border">
          {categories.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Encara no hi ha cap categoria.
            </p>
          )}

          {categories.map((category, index) => {
            const blocked = !deleteCascades && category.usageCount > 0;

            if (editingId === category.id) {
              return (
                <form
                  key={category.id}
                  className="flex items-center gap-2 p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    rename.run({
                      id: category.id,
                      name: draftName,
                      order: String(category.order),
                    });
                  }}
                >
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button type="submit" size="sm" disabled={busy || !draftName.trim()}>
                    Desa
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel·la
                  </Button>
                </form>
              );
            }

            return (
              <div key={category.id} className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Puja ${category.name}`}
                      disabled={busy || index === 0}
                      onClick={() => move.run({ id: category.id, direction: "up" })}
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Baixa ${category.name}`}
                      disabled={busy || index === categories.length - 1}
                      onClick={() => move.run({ id: category.id, direction: "down" })}
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {usageText(category.usageCount)}
                      {blocked && " · no es pot eliminar"}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edita ${category.name}`}
                    disabled={busy}
                    onClick={() => startEditing(category)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Elimina ${category.name}`}
                    disabled={busy || blocked}
                    onClick={() => {
                      setEditingId(null);
                      setConfirmingId(category.id);
                    }}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>

                {confirmingId === category.id && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-2 py-1.5">
                    <p className="text-xs text-destructive">
                      {deleteCascades && category.usageCount > 0
                        ? `S'eliminaran també ${usageText(category.usageCount)}.`
                        : "Aquesta acció no es pot desfer."}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel·la
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => remove.run({ id: category.id })}
                      >
                        Elimina
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            // Les noves van al final: crear una categoria no ha de recol·locar les altres.
            create.run({ name: newName, order: String(categories.length) });
          }}
        >
          <Input
            value={newName}
            placeholder="Nova categoria"
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy || !newName.trim()}>
            <PlusIcon className="size-4" />
            Afegeix
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
