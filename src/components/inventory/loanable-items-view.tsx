import Link from "next/link";

import { formatDate } from "@/lib/date";
import { loanRequestStatusLabels, loanRequestStatusVariants } from "@/lib/labels";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { LoanRequestDialog } from "@/components/inventory/loan-request-dialog";
import { CancelLoanRequestButton } from "@/components/inventory/loan-request-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryCategory, InventoryItem, LoanRequest, Space } from "@prisma/client";

type LoanableItem = InventoryItem & { space: Space | null; category: InventoryCategory };

/** El que veu el professorat a /inventari: només material que pot demanar. */
export function LoanableItemsView({
  items,
  myRequests,
}: {
  items: LoanableItem[];
  myRequests: (LoanRequest & { item: InventoryItem })[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventari TIC</h1>
        <p className="text-muted-foreground">
          Material prestable disponible per demanar en préstec.
        </p>
      </div>

      <InventorySearch placeholder="Cerca per marca, model o aula…" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equip</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ubicació</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Ara mateix no hi ha material prestable disponible.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <Link href={`/inventari/${item.id}`} className="hover:underline">
                    {item.brand} {item.model}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.category.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.space?.name ?? "—"}</TableCell>
                <TableCell>
                  <LoanRequestDialog itemId={item.id} itemLabel={`${item.brand} ${item.model}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Les meves sol·licituds</h2>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equip</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Estat</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {myRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Encara no has demanat cap préstec.
                  </TableCell>
                </TableRow>
              )}
              {myRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.item.brand} {request.item.model}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(request.startDate)} – {formatDate(request.endDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={loanRequestStatusVariants[request.status]}>
                      {loanRequestStatusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(request.status === "PENDENT" || request.status === "APROVADA") && (
                      <div className="flex justify-end">
                        <CancelLoanRequestButton id={request.id} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
