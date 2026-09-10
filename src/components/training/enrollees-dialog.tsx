"use client";

import { useState } from "react";
import { UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type Enrollee = { id: string; name: string; email: string; enrolledAt: string };

/** Llista de professorat inscrit, per passar llista o contactar-los. */
export function EnrolleesDialog({
  sessionTitle,
  enrollees,
}: {
  sessionTitle: string;
  enrollees: Enrollee[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UsersIcon className="size-4" />
            Veure inscrits ({enrollees.length})
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrits a {sessionTitle}</DialogTitle>
          <DialogDescription>
            {enrollees.length === 0
              ? "Encara no s'hi ha inscrit ningú."
              : `${enrollees.length} ${enrollees.length === 1 ? "persona inscrita" : "persones inscrites"}.`}
          </DialogDescription>
        </DialogHeader>

        {enrollees.length > 0 && (
          <ul className="flex max-h-80 flex-col divide-y overflow-y-auto">
            {enrollees.map((person) => (
              <li key={person.id} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  <a
                    href={`mailto:${person.email}`}
                    className="block truncate text-xs text-muted-foreground hover:underline"
                  >
                    {person.email}
                  </a>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{person.enrolledAt}</span>
              </li>
            ))}
          </ul>
        )}

        {enrollees.length > 0 && (
          <a
            href={`mailto:?bcc=${enrollees.map((p) => p.email).join(",")}`}
            className="rounded-md border px-3 py-2 text-center text-sm hover:bg-muted"
          >
            Escriure a tothom
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
