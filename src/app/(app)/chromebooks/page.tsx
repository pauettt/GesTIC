import Image from "next/image";
import Link from "next/link";
import { LaptopIcon } from "lucide-react";

import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/permissions";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
import { StudentChromebookPool } from "@/components/chromebooks/student-pool";
import {
  AwaitingDeliveryStudentDevices,
  DeliveredStudentDevices,
  PendingStudentRequests,
  TutorStudentRequests,
} from "@/components/chromebooks/student-requests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Chromebooks" };

export default async function ChromebooksPage() {
  const user = await requireUser();
  const admin = isAdmin(user.role);

  // Un coordinador TIC pot ser tutor també: les dues parts de la pantalla no
  // s'exclouen, cadascuna surt si toca.
  const requestsWithContext = { include: { tutor: true, chromebook: true } } as const;

  const [
    carts,
    spaces,
    studentChromebooks,
    myRequests,
    pendingRequests,
    awaitingDelivery,
    delivered,
  ] = await Promise.all([
      db.cart.findMany({
        include: { space: true, chromebooks: true },
        orderBy: { name: "asc" },
      }),
      db.space.findMany({ orderBy: { name: "asc" } }),
      // El pool de préstec és inventari de la coordinació: al professorat no li
      // surt, i per això tampoc es demana.
      admin
        ? db.chromebook.findMany({
            where: { isStudentLoanable: true },
            orderBy: { assetTag: "asc" },
            select: {
              id: true,
              assetTag: true,
              serialNumber: true,
              brand: true,
              model: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      // Les seves i prou: les dades d'un alumne no surten a la pantalla d'un
      // altre tutor, encara que tots dos puguin demanar equips.
      user.isTutor
        ? db.studentDeviceRequest.findMany({
            where: { tutorId: user.id },
            ...requestsWithContext,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "PENDENT" },
            ...requestsWithContext,
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      // Els que fa més dies que esperen que els vinguin a buscar, primer.
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "APROVADA" },
            ...requestsWithContext,
            orderBy: { respondedAt: "asc" },
          })
        : Promise.resolve([]),
      // Els tancats no surten aquí: són a l'historial de cada equip.
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "ENTREGADA" },
            ...requestsWithContext,
            orderBy: { deliveredAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  const availableDevices = studentChromebooks.filter((cb) => cb.status === "DISPONIBLE");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chromebooks</h1>
          <p className="text-muted-foreground">
            Carros de Chromebooks del centre i el seu estat.
          </p>
        </div>
        {admin && <CartDialog spaces={spaces} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {carts.map((cart) => {
          const available = cart.chromebooks.filter((cb) => cb.status === "DISPONIBLE").length;
          // Els donats de baixa segueixen al carro amb el seu historial, però ja
          // no compten com a equips que s'hi puguin fer servir.
          const inService = cart.chromebooks.filter((cb) => cb.status !== "BAIXA").length;
          return (
            <Link key={cart.id} href={`/chromebooks/${cart.id}`}>
              <Card className="h-full overflow-hidden pt-0 transition-colors hover:border-primary/50 hover:bg-muted/40">
                <div className="relative flex h-36 items-center justify-center border-b bg-muted">
                  {cart.imageUrl ? (
                    <Image
                      src={cart.imageUrl}
                      alt={cart.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <LaptopIcon className="size-8 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{cart.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {cart.space?.name ?? "Sense ubicació fixa"}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <span className="font-medium">{available}</span> / {inService}{" "}
                    disponibles
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {carts.length === 0 && (
          <p className="text-muted-foreground">Encara no hi ha cap carro de Chromebooks.</p>
        )}
      </div>

      {user.isTutor && <TutorStudentRequests requests={myRequests} />}

      {admin && (
        <>
          <PendingStudentRequests requests={pendingRequests} available={availableDevices} />
          <AwaitingDeliveryStudentDevices requests={awaitingDelivery} />
          <DeliveredStudentDevices requests={delivered} />
          <StudentChromebookPool chromebooks={studentChromebooks} />
        </>
      )}
    </div>
  );
}
