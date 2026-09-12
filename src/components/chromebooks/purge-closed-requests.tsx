"use client";

import { Trash2Icon } from "lucide-react";

import { purgeClosedStudentDeviceRequests } from "@/actions/student-devices";
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
import { Card, CardContent } from "@/components/ui/card";

/**
 * Neteja de fi de curs. No surt si no hi ha res tancat a esborrar: la resta de
 * l'any és un botó que no fa res i que només fa por.
 */
export function PurgeClosedRequests({ count }: { count: number }) {
  const { run, isPending } = useServerAction(purgeClosedStudentDeviceRequests, {
    successMessage: "Sol·licituds tancades esborrades",
  });

  if (count === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Hi ha {count} sol·licitud{count === 1 ? "" : "s"} tancada
            {count === 1 ? "" : "es"}
          </p>
          <p className="text-sm text-muted-foreground">
            Retornades, rebutjades i retirades. Guarden noms d&apos;alumnat que ja no fa servir
            ningú: el lloc d&apos;esborrar-les és al juliol, quan tornen els equips.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" size="sm" disabled={isPending}>
                <Trash2Icon className="size-4" />
                Buida-les
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Esborrar {count} sol·licitud{count === 1 ? "" : "s"} tancada
                {count === 1 ? "" : "es"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                S&apos;esborren els noms de l&apos;alumnat d&apos;aquestes sol·licituds i no es
                poden recuperar. Els Chromebooks, les seves notes i les incidències no es toquen,
                i les sol·licituds pendents i els préstecs actius tampoc.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel·la</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={() => run(undefined)}>
                Esborra-les
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
