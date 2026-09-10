import Image from "next/image";
import Link from "next/link";
import { LaptopIcon } from "lucide-react";

import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/permissions";
import { CartDialog } from "@/components/chromebooks/cart-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Chromebooks" };

export default async function ChromebooksPage() {
  const user = await requireUser();

  const [carts, spaces] = await Promise.all([
    db.cart.findMany({
      include: { space: true, chromebooks: true },
      orderBy: { name: "asc" },
    }),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chromebooks</h1>
          <p className="text-muted-foreground">
            Carros de Chromebooks del centre i el seu estat.
          </p>
        </div>
        {isAdmin(user.role) && <CartDialog spaces={spaces} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {carts.map((cart) => {
          const available = cart.chromebooks.filter((cb) => cb.status === "DISPONIBLE").length;
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
                    <span className="font-medium">{available}</span> / {cart.chromebooks.length}{" "}
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
    </div>
  );
}
