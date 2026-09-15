"use client";

import { useOptimistic } from "react";
import { LoaderCircleIcon } from "lucide-react";
import type { IncidentCategory } from "@prisma/client";

import { quickReportChromebookIncident } from "@/actions/incidents";
import { incidentCategoryIcons, incidentCategoryLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Els botons del QR per reportar una avaria d'un toc. Mentre la incidència es
 * desa i arriba la pàgina següent, el botó que s'ha tocat gira i la resta queden
 * aturats: sense això semblava que no havia passat res, i era fàcil tornar a tocar.
 */
export function QuickReportButtons({
  chromebookId,
  categories,
}: {
  chromebookId: string;
  categories: IncidentCategory[];
}) {
  // Optimista: es veu a l'instant i torna sol a `null` quan l'acció acaba, també si
  // acaba tornant a aquesta mateixa pàgina (una avaria ja reportada, el límit).
  const [sending, setSending] = useOptimistic<IncidentCategory | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3" aria-busy={sending !== null}>
      {categories.map((category) => {
        const Icon = incidentCategoryIcons[category];
        const isSending = sending === category;
        return (
          <form
            key={category}
            action={async () => {
              setSending(category);
              await quickReportChromebookIncident({ chromebookId, category });
            }}
          >
            <button
              type="submit"
              disabled={sending !== null}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-lg border bg-background p-4 text-center text-sm font-medium transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed",
                isSending && "border-primary bg-primary/5",
                sending !== null && !isSending && "opacity-50",
              )}
            >
              {isSending ? (
                <LoaderCircleIcon className="size-6 animate-spin text-primary" />
              ) : (
                <Icon className="size-6 text-primary" />
              )}
              {isSending ? "Enviant…" : incidentCategoryLabels[category]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
