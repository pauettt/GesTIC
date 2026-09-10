import type { ChromebookStatus } from "@prisma/client";

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
  notes: Note[];
};

export function ChromebookManager({
  cartId,
  chromebooks,
}: {
  cartId: string;
  chromebooks: Chromebook[];
}) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
      {chromebooks.map((chromebook) => (
        <ChromebookSquare key={chromebook.id} cartId={cartId} chromebook={chromebook} />
      ))}
      <AddChromebookSquare cartId={cartId} />
    </div>
  );
}
