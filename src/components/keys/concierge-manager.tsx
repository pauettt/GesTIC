"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { setConciergeActive, upsertConcierge } from "@/actions/keys";
import { useServerAction } from "@/hooks/use-server-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Concierge = { id: string; name: string; active: boolean };

/**
 * Noms dels conserges. No són usuaris: consergeria entra amb un únic compte
 * compartit, i aquests noms són el que permet saber qui va entregar cada clau.
 * Es donen de baixa en comptes d'esborrar-se perquè els préstecs antics han de
 * seguir dient-ho.
 */
export function ConciergeManager({ concierges }: { concierges: Concierge[] }) {
  const [name, setName] = useState("");
  const create = useServerAction(upsertConcierge, {
    successMessage: "Conserge afegit",
    onSuccess: () => setName(""),
  });
  const toggle = useServerAction(setConciergeActive);

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="font-semibold">Conserges</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Consergeria comparteix un sol compte, i al taulell hi poden ser tots alhora. Aquests noms
        són els que surten perquè triïn qui entrega cada clau.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {concierges.map((concierge) => (
          <Badge
            key={concierge.id}
            variant={concierge.active ? "secondary" : "outline"}
            className="gap-2 py-1 pr-1 pl-2.5"
          >
            <span className={concierge.active ? undefined : "line-through"}>{concierge.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs"
              disabled={toggle.isPending}
              onClick={() => toggle.run({ id: concierge.id, active: !concierge.active })}
            >
              {concierge.active ? "Dona de baixa" : "Reactiva"}
            </Button>
          </Badge>
        ))}
        {concierges.length === 0 && (
          <p className="text-sm text-muted-foreground">Encara no n&apos;hi ha cap.</p>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) create.run({ name });
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom del conserge"
          className="max-w-xs"
          aria-label="Nom del conserge"
        />
        <Button type="submit" disabled={create.isPending || !name.trim()}>
          <PlusIcon className="size-4" />
          Afegeix
        </Button>
      </form>
    </div>
  );
}
