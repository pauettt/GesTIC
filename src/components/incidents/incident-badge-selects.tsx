"use client";

import { useState } from "react";
import type { IncidentPriority, IncidentStatus } from "@prisma/client";
import { cn } from "cn";

import { updateIncidentPriority, updateIncidentStatus } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import {
  incidentPriorityLabels,
  incidentPriorityVariants,
  incidentStatusLabels,
  incidentStatusVariants,
} from "@/lib/labels";
import { ResolveIncidentDialog } from "@/components/incidents/resolve-incident-dialog";
import { badgeVariants } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// El disparador del desplegable és la mateixa etiqueta de color: a la llista
// d'incidències el coordinador pot canviar estat i prioritat sense entrar a
// cada fitxa. Les classes pròpies guanyen a les del SelectTrigger perquè `cn`
// resol els conflictes de Tailwind a favor de les últimes.
function BadgeSelect({
  value,
  labels,
  variant,
  ariaLabel,
  disabled,
  onSelect,
}: {
  value: string;
  labels: Record<string, string>;
  variant: BadgeVariant;
  ariaLabel: string;
  disabled: boolean;
  onSelect: (next: string) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onSelect(next)}
      items={labels}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          badgeVariants({ variant }),
          "h-5 gap-1 rounded-4xl px-2 py-0.5 text-xs focus-visible:ring-3",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(labels).map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function IncidentStatusSelect({
  incidentId,
  status,
  reporterName,
  notifies,
}: {
  incidentId: string;
  status: IncidentStatus;
  reporterName: string;
  notifies: boolean;
}) {
  const [resolving, setResolving] = useState(false);
  const { run, isPending } = useServerAction(updateIncidentStatus, {
    successMessage: "Estat actualitzat",
  });

  return (
    <>
      <BadgeSelect
        value={status}
        labels={incidentStatusLabels}
        variant={incidentStatusVariants[status]}
        ariaLabel="Canvia l'estat de la incidència"
        disabled={isPending}
        onSelect={(next) => {
          // Resoldre obre el diàleg: és l'únic canvi d'estat que avisa el
          // professorat i admet un comentari.
          if (next === "RESOLTA" && status !== "RESOLTA") {
            setResolving(true);
            return;
          }
          run({ incidentId, status: next as IncidentStatus });
        }}
      />
      <ResolveIncidentDialog
        incidentId={incidentId}
        reporterName={reporterName}
        notifies={notifies}
        open={resolving}
        onOpenChange={setResolving}
      />
    </>
  );
}

export function IncidentPrioritySelect({
  incidentId,
  priority,
}: {
  incidentId: string;
  priority: IncidentPriority;
}) {
  const { run, isPending } = useServerAction(updateIncidentPriority, {
    successMessage: "Prioritat actualitzada",
  });

  return (
    <BadgeSelect
      value={priority}
      labels={incidentPriorityLabels}
      variant={incidentPriorityVariants[priority]}
      ariaLabel="Canvia la prioritat de la incidència"
      disabled={isPending}
      onSelect={(next) => run({ incidentId, priority: next as IncidentPriority })}
    />
  );
}
