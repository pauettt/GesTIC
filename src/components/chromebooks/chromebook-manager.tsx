import type { ChromebookStatus, DeviceType } from "@prisma/client";

import type { DeviceReservationView } from "@/lib/device-reservations";
import type { CartOption } from "@/components/chromebooks/chromebook-dialog";
import { AddChromebookSquare, ChromebookSquare } from "@/components/chromebooks/chromebook-square";

type Note = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string };
};

type Chromebook = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: ChromebookStatus;
  deviceType: DeviceType;
  unavailableReason: string | null;
  notes: Note[];
  reservations: DeviceReservationView[];
};

export function ChromebookManager({
  cartId,
  carts,
  chromebooks,
}: {
  cartId: string;
  carts: CartOption[];
  chromebooks: Chromebook[];
}) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
      {chromebooks.map((chromebook) => (
        <ChromebookSquare key={chromebook.id} cartId={cartId} carts={carts} chromebook={chromebook} />
      ))}
      <AddChromebookSquare cartId={cartId} carts={carts} />
    </div>
  );
}
