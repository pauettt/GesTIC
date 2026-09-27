import { activeCoordinator, isActiveCoordinator } from "@/lib/coordinators";
import { db } from "@/lib/db";
import { addDays, formatDateTimeFull, startOfWeek } from "@/lib/date";
import { getHolidays } from "@/lib/holidays-data";
import { courseEndLabel, recurringCourse } from "@/lib/recurring-reservations";
import { defaultWeekStart } from "@/lib/schedule";
import { isAdmin, isSuperAdmin, requireUser } from "@/lib/permissions";
import { AppointmentWeek } from "@/components/appointments/appointment-week";
import { AvailabilityDialog } from "@/components/appointments/availability-dialog";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Cites" };

const who = (user: { name: string | null; email: string }) => user.name ?? user.email;

export default async function CitesPage({ searchParams }: PageProps<"/cites">) {
  const user = await requireUser();
  const { week } = await searchParams;

  // Sense setmana a la URL s'obre la que toca mirar, que en cap de setmana ja és
  // la vinent. Una data inventada tampoc no ha de tombar la pàgina.
  const requested = typeof week === "string" ? new Date(week) : null;
  const weekStart =
    requested && !Number.isNaN(requested.getTime()) ? startOfWeek(requested) : defaultWeekStart();
  const weekEnd = addDays(weekStart, 7);

  // L'agenda la porta el superadministrador —el compte de coordinació TIC—: només
  // aquest compte hi obre hores, per a cada coordinador. La resta de la
  // coordinació hi veu qui té cada cita i la pot cancel·lar.
  const canOpen = isSuperAdmin(user.role);
  const canManage = isAdmin(user.role);
  const now = new Date();
  const course = recurringCourse(now);

  const [slots, upcoming, holidays, coordinators, fixedHours] = await Promise.all([
    db.appointmentSlot.findMany({
      where: {
        startDate: { gte: weekStart, lt: weekEnd },
        // Les places lliures de qui ja no és a la coordinació no les pot demanar
        // ningú. Qui porta l'agenda les continua veient, per tancar-les.
        ...(canOpen ? {} : { OR: [{ coordinator: activeCoordinator }, { appointment: { isNot: null } }] }),
      },
      select: {
        id: true,
        startDate: true,
        availabilityId: true,
        coordinator: { select: { id: true, name: true, email: true, role: true, disabledAt: true } },
        appointment: {
          select: {
            id: true,
            purpose: true,
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ startDate: "asc" }, { coordinator: { name: "asc" } }],
    }),
    // La coordinació hi veu l'agenda sencera; la resta, només les seves, i de
    // qualsevol setmana: una cita d'aquí a un mes ha de sortir encara que estiguis
    // mirant la setmana d'ara.
    db.appointment.findMany({
      where: { slot: { endDate: { gt: now } }, ...(canManage ? {} : { userId: user.id }) },
      select: {
        id: true,
        purpose: true,
        slot: {
          select: { startDate: true, coordinator: { select: { name: true, email: true } } },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { slot: { startDate: "asc" } },
      take: 10,
    }),
    getHolidays(),
    // A qui es poden obrir hores: la coordinació amb accés. També hi surt qui ja
    // no hi és però té hores fixes aquest curs, perquè se li puguin treure.
    canOpen
      ? db.user.findMany({
          where: {
            OR: [activeCoordinator, { appointmentAvailability: { some: { schoolYear: course.schoolYear } } }],
          },
          select: { id: true, name: true, email: true, role: true, disabledAt: true },
          orderBy: { name: "asc" },
        })
      : [],
    canOpen
      ? db.appointmentAvailability.findMany({
          where: { schoolYear: course.schoolYear },
          select: { id: true, coordinatorId: true, weekday: true, periodId: true },
        })
      : [],
  ]);

  const people = coordinators.map((person) => ({
    id: person.id,
    name: who(person),
    active: isActiveCoordinator(person),
  }));
  const booked = slots.filter((slot) => slot.appointment).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cites</h1>
        <p className="text-muted-foreground">
          Demana hora amb la coordinació TIC. Cada hora oberta diu qui t&apos;atendrà: tria la que et
          vagi bé i digues per a què la vols — passar el sociograma de la teva tutoria, muntar una
          cosa a l&apos;aula, el que sigui.
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{canManage ? "Properes cites" : "Les teves cites"}</h2>
          {upcoming.map((appointment) => (
            <Card key={appointment.id} className="border-primary/40 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {canManage ? `${who(appointment.user)} · ${appointment.purpose}` : appointment.purpose}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTimeFull(appointment.slot.startDate)}
                    {appointment.slot.coordinator ? ` · amb ${who(appointment.slot.coordinator)}` : ""}
                  </p>
                </div>
                <CancelAppointmentButton appointmentId={appointment.id} label="Cancel·la" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canOpen && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Cada coordinador és una plaça: si a una hora n&apos;hi ha dos, la poden agafar dues
            persones, i cadascuna veu amb qui la té. Les{" "}
            <strong className="font-medium text-foreground">hores fixes</strong> s&apos;obren cada
            setmana fins al 30 de juny; a la graella, obre una plaça només per a aquella setmana o
            clica&apos;n una d&apos;oberta per tancar-la. Aquesta setmana n&apos;hi ha {slots.length}{" "}
            d&apos;obertes i {booked} amb cita.
          </p>
          <AvailabilityDialog
            coordinators={people}
            fixedHours={fixedHours}
            schoolYear={course.schoolYear}
            courseEnd={courseEndLabel(course.schoolYear)}
          />
        </div>
      )}

      <AppointmentWeek
        weekStart={weekStart}
        slots={slots.map((slot) => {
          const appointment = slot.appointment;
          const isOwn = appointment?.userId === user.id;
          // Qui la té i per a què, només per a la coordinació i per a la mateixa
          // persona. El motiu és text lliure, i el que arriba a un component de
          // client es pot llegir encara que no es pinti: per això es retalla
          // aquí i no a la casella.
          const canSeeDetails = canManage || isOwn;
          return {
            id: slot.id,
            startDate: slot.startDate,
            fixed: slot.availabilityId !== null,
            coordinatorId: slot.coordinator?.id ?? null,
            coordinatorName: slot.coordinator ? who(slot.coordinator) : null,
            bookable: slot.coordinator !== null && isActiveCoordinator(slot.coordinator),
            appointment: appointment
              ? {
                  id: appointment.id,
                  isOwn,
                  purpose: canSeeDetails ? appointment.purpose : null,
                  userName: canSeeDetails ? who(appointment.user) : null,
                }
              : null,
          };
        })}
        coordinators={people.filter((person) => person.active)}
        holidays={holidays}
        canOpen={canOpen}
        canManage={canManage}
      />

      {slots.length === 0 && !canOpen && (
        <p className="text-sm text-muted-foreground">
          Aquesta setmana la coordinació no ha obert cap hora. Mira les setmanes següents.
        </p>
      )}
    </div>
  );
}
