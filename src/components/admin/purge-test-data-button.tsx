"use client";

import { Trash2Icon } from "lucide-react";

import { purgeTestData } from "@/actions/admin";
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

/** Esborra les dades de prova, després de dir exactament què se n'anirà. */
export function PurgeTestDataButton({ summary, disabled }: { summary: string; disabled: boolean }) {
  const { run, isPending } = useServerAction(purgeTestData, {
    successMessage: "Dades de prova esborrades",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" disabled={disabled || isPending}>
            <Trash2Icon className="size-4" />
            Esborra les dades de prova
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Esborrar les dades de prova?</AlertDialogTitle>
          <AlertDialogDescription>
            S&apos;esborraran {summary}. Les fotos d&apos;aquestes incidències també marxaran del
            magatzem. No es pot desfer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel·la</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={() => run(undefined)}>
            Esborra-ho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
