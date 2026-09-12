import { db } from "@/lib/db";
import { addDays, formatDateTimeFull, startOfWeek } from "@/lib/date";
import { defaultWeekStart } from "@/lib/schedule";
import { isAdmin, requireUser } from "@/lib/permissions";
import { AppointmentWeek } from "@/components/appointments/appointment-week";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Cites" };

export default async function CitesPage({ searchParams }: PageProps<"/cites">) {
  const user = await requireUser();
  const { week } = await searchParams;

  // Sense setmana a la URL s'obre la que toca mirar, que en cap de setmana ja és
  // la vinent. Una data inventada tampoc no ha de tombar la pàgina.
  const requested = typeof week === "string" ? new Date(week) : null;
  const weekStart =
    requested && !Number.isNaN(requested.getTime()) ? startOfWeek(requested) : defaultWeekStart();
  const weekEnd = addDays(weekStart, 7);

  const canManage = isAdmin(user.role);
  const now = new Date();

  const [slots, upcoming] = await Promise.all([
    db.appointmentSlot.findMany({
      where: { startDate: { gte: weekStart, lt: weekEnd } },
      include: { openedBy: true, appointment: { include: { user: true } } },
      orderBy: { startDate: "asc" },
    }),
    // La coordinació hi veu la seva agenda sencera —és amb qui es demana hora—;
    // la resta, només les seves, i de qualsevol setmana: una cita d'aquí a un
    // mes ha de sortir encara que estiguis mirant la setmana d'ara.
    db.appointment.findMany({
      where: { slot: { endDate: { gt: now } }, ...(canManage ? {} : { userId: user.id }) },
      include: { slot: { include: { openedBy: true } }, user: true },
      orderBy: { slot: { startDate: "asc" } },
      take: 10,
    }),
  ]);

  const booked = slots.filter((slot) => slot.appointment).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cites</h1>
        <p className="text-muted-foreground">
          Demana hora amb la coordinació TIC. Les hores obertes són les que la coordinació té
          lliures: agafa la que et vagi bé i digues per a què la vols — passar el sociograma de la
          teva tutoria, muntar una cosa a l&apos;aula, el que sigui.
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
                    {canManage
                      ? `${appointment.user.name ?? appointment.user.email} · ${appointment.purpose}`
                      : appointment.purpose}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTimeFull(appointment.slot.startDate)}
                    {!canManage && appointment.slot.openedBy
                      ? ` · amb ${appointment.slot.openedBy.name ?? appointment.slot.openedBy.email}`
                      : ""}
                  </p>
                </div>
                <CancelAppointmentButton appointmentId={appointment.id} label="Cancel·la" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <p className="text-sm text-muted-foreground">
          Clica una hora per obrir-la, i torna-hi per tancar-la. Al professorat només li surten les
          obertes, i cada hora oberta és una cita. Aquesta setmana n&apos;hi ha {slots.length}{" "}
          d&apos;obertes i {booked} amb cita.
        </p>
      )}

      <AppointmentWeek
        weekStart={weekStart}
        slots={slots.map((slot) => ({
          ...slot,
          openedByName: slot.openedBy ? (slot.openedBy.name ?? slot.openedBy.email) : null,
        }))}
        currentUserId={user.id}
        canManage={canManage}
      />

      {slots.length === 0 && !canManage && (
        <p className="text-sm text-muted-foreground">
          Aquesta setmana la coordinació no ha obert cap hora. Mira les setmanes següents.
        </p>
      )}
    </div>
  );
}
