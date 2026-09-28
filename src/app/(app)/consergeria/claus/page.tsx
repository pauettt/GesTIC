import Link from "next/link";

import { db } from "@/lib/db";
import { orderCarts } from "@/lib/cart-order";
import { formatDate } from "@/lib/date";
import { byKeyNumber } from "@/lib/keys";
import { requireKeyAccess } from "@/lib/permissions";
import { KeyDialog } from "@/components/keys/key-dialog";
import { KeyList, type KeyRow } from "@/components/keys/key-list";

export const metadata = { title: "Claus del centre" };

export default async function ClausPage() {
  await requireKeyAccess();

  const [allKeys, rawCarts, usedKeys] = await Promise.all([
    db.key.findMany({
      include: {
        cart: true,
        _count: { select: { loans: { where: { returnedAt: null } } } },
      },
    }),
    db.cart.findMany({ select: { id: true, name: true, order: true } }),
    // Les que tenen historial no s'esborren (vegeu `deleteKey`): el botó no hi surt.
    db.keyLoan.findMany({ distinct: ["keyId"], select: { keyId: true } }),
  ]);
  const withHistory = new Set(usedKeys.map((loan) => loan.keyId));
  const rows: KeyRow[] = allKeys.sort(byKeyNumber).map((key) => ({
    id: key.id,
    number: key.number,
    name: key.name,
    cartId: key.cartId,
    cartName: key.cart?.name ?? null,
    copies: key.copies,
    notes: key.notes,
    out: key._count.loans,
    withHistory: withHistory.has(key.id),
    archivedOn: key.archivedAt && formatDate(key.archivedAt),
  }));

  const customOrder = rawCarts.some((c) => c.order !== null);
  const savedOrder = customOrder
    ? [...rawCarts].filter((c) => c.order !== null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => c.id)
    : [];
  const carts = orderCarts(rawCarts, savedOrder);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/consergeria" className="text-sm text-muted-foreground hover:underline">
          &larr; Consergeria
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Claus del centre</h1>
            <p className="text-muted-foreground">
              Aules, magatzems i carros de Chromebooks. Cada clau amb el seu número i les còpies que
              n&apos;hi ha al clauer. La que ja no es fa servir s&apos;arxiva: surt del taulell i dels
              carros, però se&apos;n conserva l&apos;historial. Esborrar només es pot una que no
              s&apos;ha deixat mai.
            </p>
          </div>
          <KeyDialog carts={carts} />
        </div>
      </div>

      <KeyList keys={rows} carts={carts} />
    </div>
  );
}
