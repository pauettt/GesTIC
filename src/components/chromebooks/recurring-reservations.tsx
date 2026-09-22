"use client";

import { useState } from "react";
import { CheckIcon, RepeatIcon, XIcon } from "lucide-react";

import {
  cancelRecurringReservation,
  decideRecurringReservation,
  requestRecurringReservation,
} from "@/actions/recurring-reservations";
import { useServerAction } from "@/hooks/use-server-action";
import { SCHOOL_PERIODS, SCHOOL_WEEKDAYS } from "@/lib/schedule";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const weekdayItems = SCHOOL_WEEKDAYS.map((label, index) => ({ value: String(index + 1), label }));
const periodItems = SCHOOL_PERIODS.map((period) => ({
  value: String(period.id),
  label: `${period.label} · ${period.start}`,
}));

/**
 * Demanar un carro cada setmana, el mateix dia i a la mateixa sessió. El motiu
 * és obligatori: la coordinació ha de poder decidir si una sessió queda
 * apartada tot el curs.
 */
export function RecurringRequestDialog({
  cartId,
  cartName,
  period,
}: {
  cartId: string;
  cartName: string;
  /** «des d'ara fins al 30 de juny del 2027», o «de l'1 de setembre…» a l'estiu. */
  period: string;
}) {
  const [open, setOpen] = useState(false);
  const [weekday, setWeekday] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [purpose, setPurpose] = useState("");
  const { run, isPending } = useServerAction(requestRecurringReservation, {
    successMessage: "Reserva fixa demanada: la coordinació TIC l'ha d'aprovar",
    onSuccess: () => {
      setOpen(false);
      setWeekday("");
      setPeriodId("");
      setPurpose("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <RepeatIcon className="size-4" />
            Demana una reserva fixa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserva fixa de {cartName}</DialogTitle>
          <DialogDescription>
            El mateix dia i la mateixa sessió cada setmana, {period}. L&apos;ha d&apos;aprovar la coordinació TIC:
            mentrestant, la sessió continua lliure per a tothom, i les setmanes que algú ja tingui reservades es
            respectaran.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ cartId, weekday: Number(weekday), periodId: Number(periodId), purpose });
          }}
        >
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="recurring-weekday">Dia</FieldLabel>
                <Select value={weekday} onValueChange={(next) => next && setWeekday(next)} items={weekdayItems}>
                  <SelectTrigger id="recurring-weekday" className="w-full">
                    <SelectValue placeholder="Tria el dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekdayItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-period">Sessió</FieldLabel>
                <Select value={periodId} onValueChange={(next) => next && setPeriodId(next)} items={periodItems}>
                  <SelectTrigger id="recurring-period" className="w-full">
                    <SelectValue placeholder="Tria la sessió" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="recurring-purpose">Motiu</FieldLabel>
              <Textarea
                id="recurring-purpose"
                rows={3}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Per a què el necessites cada setmana? (grup, matèria, projecte…)"
                maxLength={300}
                required
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel·la
              </Button>
              <Button type="submit" disabled={isPending || !weekday || !periodId || purpose.trim().length < 3}>
                {isPending ? "Enviant…" : "Demana-la"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Aprovar reserva totes les setmanes que queden del curs d'un sol cop, i per
 * això demana confirmació i diu quines setmanes ja té algú altre, que es
 * respectaran. Rebutjar obre un diàleg per a la nota que li arribarà per correu.
 */
export function DecideRecurringButtons({ id, skipped }: { id: string; skipped: string[] }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const approve = useServerAction(decideRecurringReservation, { successMessage: "Reserva fixa aprovada" });
  const reject = useServerAction(decideRecurringReservation, {
    successMessage: "Reserva fixa rebutjada",
    onSuccess: () => {
      setRejectOpen(false);
      setNote("");
    },
  });

  return (
    <div className="flex justify-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="outline" disabled={approve.isPending}>
              <CheckIcon className="size-4" />
              Aprova
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar la reserva fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {skipped.length === 0
                ? "Es reservaran totes les setmanes que queden del curs."
                : `Es reservaran totes les setmanes que queden del curs menys ${
                    skipped.length === 1 ? "una, que ja té" : `${skipped.length}, que ja té`
                  } algú altre: ${skipped.join(", ")}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·la</AlertDialogCancel>
            <AlertDialogAction onClick={() => approve.run({ id, approve: true })}>Aprova-la</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="ghost">
              <XIcon className="size-4" />
              Rebutja
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rebutja la reserva fixa</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`recurring-reject-${id}`}>Motiu (opcional)</FieldLabel>
              <Textarea
                id={`recurring-reject-${id}`}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ho rebrà per correu (per exemple, quina altra sessió li podeu oferir)"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel·la
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={reject.isPending}
                onClick={() => reject.run({ id, approve: false, responseNote: note })}
              >
                {reject.isPending ? "Desant…" : "Rebutja"}
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Retirar-la, si encara és pendent, o anul·lar-la, si ja està aprovada. */
export function CancelRecurringButton({
  id,
  approved,
  mine,
}: {
  id: string;
  approved: boolean;
  mine: boolean;
}) {
  const { run, isPending } = useServerAction(cancelRecurringReservation, {
    successMessage: approved ? "Reserva fixa anul·lada" : "Reserva fixa retirada",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="ghost" disabled={isPending}>
            {approved ? "Anul·la-la" : "Retira-la"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{approved ? "Anul·lar la reserva fixa?" : "Retirar la petició?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {approved
              ? `Les setmanes que queden tornaran a ser lliures per a tothom.${
                  mine ? "" : " A qui la tenia li arribarà un correu."
                }`
              : "La coordinació TIC ja no l'haurà de decidir."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={() => run({ id })}>{approved ? "Anul·la-la" : "Retira-la"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
