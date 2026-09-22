import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LaptopIcon, QrCodeIcon } from "lucide-react";

import { db } from "@/lib/db";
import { canAccessKeys, isAdmin, requireUser } from "@/lib/permissions";
import { addDays, startOfWeek } from "@/lib/date";
import { isFreeNow, openDeviceReservations, reservationViews } from "@/lib/device-reservations";
import { deviceSummary } from "@/lib/devices";
import { placedSpaceSelect } from "@/lib/locations";
import { defaultWeekStart } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { deleteCart } from "@/actions/chromebooks";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
import { CartImportDialog } from "@/components/chromebooks/cart-import-dialog";
import { CartPlace } from "@/components/chromebooks/cart-place";
import { ChromebookManager } from "@/components/chromebooks/chromebook-manager";
import { ChromebookStatusGrid } from "@/components/chromebooks/chromebook-status-grid";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { WeeklySchedule } from "@/components/chromebooks/weekly-schedule";
import { Separator } from "@/components/ui/separator";

export default async function CartDetailPage({
  params,
  searchParams,
}: PageProps<"/chromebooks/[id]">) {
  const user = await requireUser();
  const admin = isAdmin(user.role);
  const { id } = await params;
  const { week } = await searchParams;

  // Igual que a /cites: sense setmana a la URL s'obre la que toca mirar, que en
  // cap de setmana ja és la vinent, i una data inventada no tomba la pàgina.
  const requested = typeof week === "string" ? new Date(week) : null;
  const weekStart =
    requested && !Number.isNaN(requested.getTime()) ? startOfWeek(requested) : defaultWeekStart();
  const weekEnd = addDays(weekStart, 7);
  const now = new Date();

  const [cart, spaces, carts, existingChromebooks] = await Promise.all([
    db.cart.findUnique({
      where: { id },
      include: {
        space: { select: placedSpaceSelect },
        chromebooks: {
          orderBy: { assetTag: "asc" },
          include: {
            notes: {
              include: { author: { select: { name: true, email: true } } },
              orderBy: { createdAt: "desc" },
            },
            reservations: openDeviceReservations,
          },
        },
        reservations: {
          where: { status: "CONFIRMADA", startDate: { lt: weekEnd }, endDate: { gte: weekStart } },
          // La graella viatja al navegador de tot el professorat: només el nom
          // i el correu de qui ha reservat, no la fila d'usuari sencera.
          include: { user: { select: { name: true, email: true } } },
          orderBy: { startDate: "asc" },
        },
      },
    }),
    db.space.findMany({ orderBy: { name: "asc" } }),
    admin
      ? db.cart.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    // Per a la vista prèvia de la importació: cap dispositiu es pot repetir, sigui del carro que sigui.
    admin
      ? db.chromebook.findMany({ select: { assetTag: true, serialNumber: true } })
      : Promise.resolve([]),
  ]);

  if (!cart) notFound();

  // Tothom ho veu abans de reservar: els donats de baixa ja no compten com a equips del carro.
  const inService = cart.chromebooks.filter((chromebook) => chromebook.status !== "BAIXA");
  // Els que algú té ara per una reserva d'equip, tampoc no hi són.
  const available = inService.filter((chromebook) => isFreeNow(chromebook, now)).length;
  const summary = deviceSummary(inService);
  const viewer = { id: user.id, admin };
  // Per a la graella: quants equips hi faltaran a cada sessió perquè algú els té reservats a part.
  const deviceBookings = inService.flatMap((chromebook) => chromebook.reservations);
  const existing = {
    assetTags: existingChromebooks.map((chromebook) => chromebook.assetTag),
    serialNumbers: existingChromebooks.flatMap((chromebook) =>
      chromebook.serialNumber ? [chromebook.serialNumber] : [],
    ),
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/chromebooks" className="text-sm text-muted-foreground hover:underline">
          &larr; Tots els carros
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {cart.imageUrl ? (
                <Image src={cart.imageUrl} alt={cart.name} fill sizes="96px" className="object-cover" />
              ) : (
                <LaptopIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{cart.name}</h1>
              <CartPlace space={cart.space} />
              {(summary || cart.serialNumber) && (
                <p className="text-muted-foreground">
                  {[summary, cart.serialNumber && `Núm. sèrie: ${cart.serialNumber}`].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/incidencies?cartId=${cart.id}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Historial d&apos;incidències
                </Link>
                {canAccessKeys(user.role) && (
                  <Link
                    href={`/consergeria/historial?carro=${cart.id}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Qui s&apos;ha endut aquest carro
                  </Link>
                )}
              </div>
            </div>
          </div>
          {admin && (
            <div className="flex gap-2">
              <CartDialog
                spaces={spaces}
                cart={{
                  id: cart.id,
                  name: cart.name,
                  serialNumber: cart.serialNumber ?? "",
                  spaceId: cart.spaceId ?? "",
                  imageUrl: cart.imageUrl ?? "",
                }}
                trigger={
                  <button className="rounded-md border px-2 py-1.5 text-sm hover:bg-muted">
                    Edita
                  </button>
                }
              />
              <ConfirmDeleteButton
                action={deleteCart}
                input={{ id: cart.id }}
                title="Eliminar aquest carro?"
                description="Només es pot esborrar un carro buit: si hi queden dispositius, mou-los abans a un altre carro. Les reserves del carro s'eliminaran, i les claus que hi estiguin lligades quedaran sense carro."
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Horari d&apos;ocupació</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          <span className={cn("font-medium", available < inService.length ? "text-red-700" : "text-foreground")}>
            {available} de {inService.length} dispositius disponibles.
          </span>{" "}
          <span className="hidden md:inline">Clica una sessió lliure per reservar-la a l&apos;instant.</span>
          <span className="md:hidden">
            Toca les sessions lliures que vulguis del dia i reserva-les totes alhora.
          </span>
        </p>
        <WeeklySchedule
          cartId={cart.id}
          weekStart={weekStart}
          reservations={cart.reservations}
          deviceBookings={deviceBookings}
          currentUserId={user.id}
          isAdmin={admin}
        />
      </div>

      {!admin && inService.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-1 text-lg font-semibold">Dispositius del carro</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Clica un dispositiu per saber si hi ha res a tenir en compte abans de fer-lo servir, per
              reservar-lo sol o per reportar-ne un problema.
            </p>
            <ChromebookStatusGrid
              chromebooks={inService.map((chromebook) => ({
                id: chromebook.id,
                assetTag: chromebook.assetTag,
                deviceType: chromebook.deviceType,
                status: chromebook.status,
                unavailableReason: chromebook.unavailableReason,
                reservations: reservationViews(chromebook.reservations, viewer, now),
              }))}
            />
          </div>
        </>
      )}

      {admin && (
        <>
          <Separator />
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Dispositius del carro</h2>
              <div className="flex flex-wrap gap-2">
                {cart.chromebooks.length > 0 && (
                  <CartImportDialog cartId={cart.id} cartName={cart.name} existing={existing} />
                )}
                <Link
                  href={`/chromebooks/${cart.id}/etiquetes`}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <QrCodeIcon className="size-4" />
                  Imprimeix el QR del carro
                </Link>
              </div>
            </div>
            {cart.chromebooks.length === 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Aquest carro encara no té dispositius. Importa&apos;ls del full on els teniu documentats, o
                  afegeix-los un a un.
                </p>
                <CartImportDialog
                  cartId={cart.id}
                  cartName={cart.name}
                  existing={existing}
                  triggerVariant="default"
                />
              </div>
            )}
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" /> Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-red-400 bg-red-100" /> En incidència,
                reservat o no disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-slate-300 bg-slate-100" /> Donat de baixa
              </span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Clica un dispositiu per veure&apos;n els detalls, reservar-lo sol, marcar-lo com a no disponible,
              editar-lo, moure&apos;l a un altre carro o donar-lo de baixa.
            </p>
            <ChromebookManager
              cartId={cart.id}
              carts={carts}
              chromebooks={cart.chromebooks.map((chromebook) => ({
                ...chromebook,
                reservations: reservationViews(chromebook.reservations, viewer, now),
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
