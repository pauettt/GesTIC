"use client";

import { TrashIcon } from "lucide-react";

import { useServerAction } from "@/hooks/use-server-action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ActionResult = { success: true } | { success: false; error: string };

export function ConfirmDeleteButton<TInput, TResult extends ActionResult = ActionResult>({
  action,
  input,
  title = "Segur que vols eliminar-ho?",
  description = "Aquesta acció no es pot desfer.",
  label = "Elimina",
  successMessage,
}: {
  action: (input: TInput) => Promise<TResult>;
  input: TInput;
  title?: string;
  description?: string;
  label?: string;
  successMessage?: string | ((input: TInput, result: Extract<TResult, { success: true }>) => string);
}) {
  const { run, isPending } = useServerAction(action, { successMessage });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <TrashIcon className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel·la</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={() => run(input)}>
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
