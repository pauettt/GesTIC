"use client";

import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

type ActionResult = { success: true } | { success: false; error: string };

export function useServerAction<TInput>(
  action: (input: TInput) => Promise<ActionResult>,
  options?: {
    onSuccess?: () => void;
    successMessage?: string | ((input: TInput) => string);
    /**
     * Per al `set` d'un `useOptimistic`. Es crida dins la transició i abans
     * d'anar al servidor, que és on ha de ser perquè el valor es vegi a l'instant
     * i torni sol al del servidor quan la transició acaba, també si ha fallat.
     */
    optimistic?: (input: TInput) => void;
  },
) {
  const [isPending, startTransition] = useTransition();

  function run(input: TInput) {
    startTransition(async () => {
      options?.optimistic?.(input);
      try {
        const result = await action(input);
        if (result.success) {
          const message =
            typeof options?.successMessage === "function"
              ? options.successMessage(input)
              : options?.successMessage;
          if (message) toast.success(message);
          options?.onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        // Les accions que acaben en redirect() (crear incidència, crear
        // consulta...) ho fan llançant una excepció interna de Next. Sense
        // aquesta línia el catch se la menjava i sortia un error fals encara
        // que tot hagués anat bé.
        unstable_rethrow(error);
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
