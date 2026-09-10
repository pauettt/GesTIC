"use client";

import { useState } from "react";
import type { IncidentPriority, IncidentStatus } from "@prisma/client";

import { assignIncident, updateIncidentPriority, updateIncidentStatus } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import { incidentPriorityLabels, incidentStatusLabels } from "@/lib/labels";
import { toSelectItems } from "@/lib/utils";
import { ResolveIncidentDialog } from "@/components/incidents/resolve-incident-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UNASSIGNED = "__cap__";

type Coordinator = { id: string; name: string };

export function StatusControls({
  incidentId,
  status,
  priority,
  assignedToId,
  coordinators,
  reporterName,
  notifies,
}: {
  incidentId: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  assignedToId: string | null;
  coordinators: Coordinator[];
  reporterName: string;
  notifies: boolean;
}) {
  const [resolving, setResolving] = useState(false);
  const statusAction = useServerAction(updateIncidentStatus, {
    successMessage: "Estat actualitzat",
  });
  const priorityAction = useServerAction(updateIncidentPriority, {
    successMessage: "Prioritat actualitzada",
  });
  const assignAction = useServerAction(assignIncident, {
    successMessage: "Assignació actualitzada",
  });

  const assignItems = {
    [UNASSIGNED]: "Sense assignar",
    ...toSelectItems(coordinators, (c) => c.id, (c) => c.name),
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="status-control">Estat</FieldLabel>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "RESOLTA" && status !== "RESOLTA") {
              setResolving(true);
              return;
            }
            statusAction.run({ incidentId, status: value as IncidentStatus });
          }}
          items={incidentStatusLabels}
        >
          <SelectTrigger id="status-control" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(incidentStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="priority-control">Prioritat</FieldLabel>
        <Select
          value={priority}
          onValueChange={(value) =>
            priorityAction.run({ incidentId, priority: value as IncidentPriority })
          }
          items={incidentPriorityLabels}
        >
          <SelectTrigger id="priority-control" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(incidentPriorityLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="assign-control">Assignada a</FieldLabel>
        <Select
          value={assignedToId ?? UNASSIGNED}
          onValueChange={(value) =>
            assignAction.run({
              incidentId,
              assignedToId: value === UNASSIGNED ? null : value,
            })
          }
          items={assignItems}
        >
          <SelectTrigger id="assign-control" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(assignItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <ResolveIncidentDialog
        incidentId={incidentId}
        reporterName={reporterName}
        notifies={notifies}
        open={resolving}
        onOpenChange={setResolving}
      />
    </div>
  );
}
