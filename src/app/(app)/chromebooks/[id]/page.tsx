import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LaptopIcon, QrCodeIcon } from "lucide-react";

import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/permissions";
import { addDays, startOfWeek } from "@/lib/date";
import { deleteCart } from "@/actions/chromebooks";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
import { ChromebookManager } from "@/components/chromebooks/chromebook-manager";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { WeeklySchedule } from "@/components/chromebooks/weekly-schedule";
import { Separator } from "@/components/ui/separator";

export default async function CartDetailPage({
  params,
  searchParams,
}: PageProps<"/chromebooks/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { week } = await searchParams;

  const weekStart = startOfWeek(typeof week === "string" ? new Date(week) : new Date());
  const weekEnd = addDays(weekStart, 7);

  const [cart, spaces] = await Promise.all([
    db.cart.findUnique({
      where: { id },
      include: {
        space: true,
        chromebooks: {
          orderBy: { assetTag: "asc" },
          include: { notes: { include: { author: true }, orderBy: { createdAt: "desc" } } },
        },
        reservations: {
          where: { status: "CONFIRMADA", startDate: { lt: weekEnd }, endDate: { gte: weekStart } },
          include: { user: true },
          orderBy: { startDate: "asc" },
        },
      },
    }),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!cart) notFound();

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
              <p className="text-muted-foreground">
                {cart.space?.name ?? "Sense ubicació fixa"}
                {cart.serialNumber ? ` · Núm. sèrie: ${cart.serialNumber}` : ""}
              </p>
              <Link
                href={`/incidencies?cartId=${cart.id}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                Veure historial d&apos;incidències del carro
              </Link>
            </div>
          </div>
          {isAdmin(user.role) && (
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
                  <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                    Edita
                  </button>
                }
              />
              <ConfirmDeleteButton
                action={deleteCart}
                input={{ id: cart.id }}
                title="Eliminar aquest carro?"
                description="Els Chromebooks del carro no s'eliminaran, però quedaran sense carro assignat. Les reserves associades sí que s'eliminaran."
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Horari d&apos;ocupació</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Clica una sessió lliure per reservar-la a l&apos;instant.
        </p>
        <WeeklySchedule
          cartId={cart.id}
          weekStart={weekStart}
          reservations={cart.reservations}
          currentUserId={user.id}
          isAdmin={isAdmin(user.role)}
        />
      </div>

      {isAdmin(user.role) && (
        <>
          <Separator />
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chromebooks del carro</h2>
              <Link
                href={`/chromebooks/${cart.id}/etiquetes`}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <QrCodeIcon className="size-4" />
                Imprimeix etiquetes QR
              </Link>
            </div>
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" /> Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-blue-400 bg-blue-100" /> Reservat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-red-400 bg-red-100" /> En incidència
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border-2 border-slate-300 bg-slate-100" /> Donat de baixa
              </span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Clica un Chromebook per veure-hi detalls, editar-lo o eliminar-lo.
            </p>
            <ChromebookManager cartId={cart.id} chromebooks={cart.chromebooks} />
          </div>
        </>
      )}
    </div>
  );
}
