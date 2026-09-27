"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOffIcon } from "lucide-react";

import { createHoliday, deleteHoliday } from "@/actions/holidays";
import { useServerAction } from "@/hooks/use-server-action";
import { holidayRangeLabel, type Holiday } from "@/lib/holidays";
import { createHolidaySchema, type CreateHolidayInput } from "@/lib/validations/holidays";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** «1 sessió de reserves fixes alliberada», «3 sessions … alliberades». */
const fixedSessions = (count: number, singular: string, plural: string) =>
  count === 1 ? `1 sessió de reserves fixes ${singular}` : `${count} sessions de reserves fixes ${plural}`;
const oneOffReservations = (count: number) =>
  count === 1
    ? "hi ha 1 reserva puntual aquells dies, que es manté"
    : `hi ha ${count} reserves puntuals aquells dies, que es mantenen`;
/** «3 hores de cites tancades», «1 hora de cites tornada a obrir». */
const appointmentHours = (count: number, singular: string, plural: string) =>
  count === 1 ? `1 hora de cites ${singular}` : `${count} hores de cites ${plural}`;
const keptAppointments = (count: number) =>
  count === 1
    ? "hi ha 1 cita aquells dies, que es manté: cancel·la-la a Cites si cal"
    : `hi ha ${count} cites aquells dies, que es mantenen: cancel·la-les a Cites si cal`;

/**
 * El calendari de festius del curs: la coordinació l'entra un cop, quan surt el
 * calendari escolar, i hi afegeix el que vagi sortint (un dia de lliure
 * disposició, una festa local). Els que ja han passat no hi surten.
 */
export function HolidaysDialog({ holidays }: { holidays: Holiday[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateHolidayInput>({
    resolver: zodResolver(createHolidaySchema),
    defaultValues: { name: "", startDate: "", endDate: "" },
  });

  const { run, isPending } = useServerAction(createHoliday, {
    successMessage: (_input, { freed, oneOff, closedHours, appointments }) =>
      [
        "Festiu desat",
        freed > 0 && fixedSessions(freed, "alliberada", "alliberades"),
        oneOff > 0 && oneOffReservations(oneOff),
        closedHours > 0 && appointmentHours(closedHours, "tancada", "tancades"),
        appointments > 0 && keptAppointments(appointments),
      ]
        .filter(Boolean)
        .join(" · "),
    onSuccess: () => reset(),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <CalendarOffIcon className="size-4" />
            Festius i vacances
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Festius i vacances</DialogTitle>
          <DialogDescription>
            Aquells dies no hi ha classe: no es poden reservar carros ni equips, les reserves fixes
            i les hores fixes de cites se&apos;ls salten i no surt cap recordatori per correu. Les
            cites que ja estiguin demanades es mantenen.
          </DialogDescription>
        </DialogHeader>

        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No n&apos;hi ha cap per endavant. Entra els del calendari escolar del curs.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border" aria-label="Festius per endavant">
            {holidays.map((holiday) => (
              <li key={holiday.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{holiday.name}</span>{" "}
                  <span className="text-muted-foreground">· {holidayRangeLabel(holiday)}</span>
                </span>
                <ConfirmDeleteButton
                  action={deleteHoliday}
                  input={{ id: holiday.id }}
                  label={`Esborra ${holiday.name}`}
                  title={`Esborrar «${holiday.name}»?`}
                  description="Aquells dies tornaran a ser lectius: les reserves fixes que hi queien s'hi tornaran a posar si la sessió encara és lliure, i les hores fixes de cites es tornaran a obrir."
                  successMessage={(_input, { restored, reopened }) =>
                    [
                      "Festiu esborrat",
                      restored > 0 && fixedSessions(restored, "tornada a posar", "tornades a posar"),
                      reopened > 0 && appointmentHours(reopened, "tornada a obrir", "tornades a obrir"),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }
                />
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit((values) => run(values))}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="holiday-name">Nom</FieldLabel>
              <Input
                id="holiday-name"
                placeholder="Nadal, Setmana Santa, lliure disposició…"
                {...register("name")}
              />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.startDate)}>
                <FieldLabel htmlFor="holiday-start">Primer dia</FieldLabel>
                <Input id="holiday-start" type="date" {...register("startDate")} />
                <FieldError errors={errors.startDate ? [errors.startDate] : undefined} />
              </Field>
              <Field data-invalid={Boolean(errors.endDate)}>
                <FieldLabel htmlFor="holiday-end">Últim dia</FieldLabel>
                <Input id="holiday-end" type="date" {...register("endDate")} />
                <FieldError errors={errors.endDate ? [errors.endDate] : undefined} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Per a un sol dia, posa el mateix dia a totes dues caselles.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Tanca
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Desant…" : "Afegeix el festiu"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
