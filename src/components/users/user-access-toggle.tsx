"use client";

import { setUserAccess } from "@/actions/users";
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

/**
 * Treure l'accés demana confirmació perquè tanca la sessió a l'instant; tornar-lo
 * no, perquè no fa mal a ningú.
 */
export function UserAccessToggle({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  /** Cert si ara mateix té l'accés retirat. */
  disabled: boolean;
}) {
  const { run, isPending } = useServerAction(setUserAccess, {
    successMessage: disabled ? `${userName} torna a tenir accés` : `${userName} ja no té accés`,
  });

  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => run({ userId, enabled: true })}>
        Torna l&apos;accés
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" disabled={isPending}>
            Treu l&apos;accés
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Treure l&apos;accés a {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Per a qui ja no és al centre. No podrà entrar a gesTIC, se li tancarà la sessió ara
            mateix i deixarà de rebre avisos. El que va fer —incidències, préstecs, claus— continuarà
            dient qui ho va fer, i li pots tornar l&apos;accés quan vulguis.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel·la</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={() => run({ userId, enabled: false })}>
            Treu l&apos;accés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
