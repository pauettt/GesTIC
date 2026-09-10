"use client";

import { useTransition } from "react";
import { toast } from "sonner";

type ActionResult = { success: true } | { success: false; error: string };

export function useServerAction<TInput>(
  action: (input: TInput) => Promise<ActionResult>,
  options?: { onSuccess?: () => void; successMessage?: string },
) {
  const [isPending, startTransition] = useTransition();

  function run(input: TInput) {
    startTransition(async () => {
      try {
        const result = await action(input);
        if (result.success) {
          if (options?.successMessage) toast.success(options.successMessage);
          options?.onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        // Sense aquest catch, una caiguda de xarxa o una excepció del servidor
        // deixarien la promesa rebutjada: el botó es quedaria deshabilitat per
        // sempre i l'usuari no sabria si l'acció s'ha desat o no.
        console.error("[acció] ha fallat:", error);
        toast.error(
          "No s'ha pogut completar l'acció. Comprova la connexió i torna-ho a provar.",
        );
      }
    });
  }

  return { run, isPending };
}
