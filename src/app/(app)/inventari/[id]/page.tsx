import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { inventoryItemStatusLabels, inventoryItemStatusVariants } from "@/lib/labels";
import { LoanRequestDialog } from "@/components/inventory/loan-request-dialog";
import {
  ItemAvailability,
  ItemIncidentHistory,
  ItemLoanHistory,
} from "@/components/inventory/item-histories";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Fitxa de l'equip" };

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function InventoryItemDetailPage({ params }: PageProps<"/inventari/[id]">) {
  const user = await requireUser();
  const canManage = isAdmin(user.role);
  const { id } = await params;

  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      space: true,
      category: true,
      loanRequests: { include: { requester: true }, orderBy: { createdAt: "desc" } },
      incidents: { include: { reporter: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!item) notFound();
  // El professorat només pot consultar la fitxa del material que pot demanar.
  if (!canManage && !item.isLoanable) notFound();

  const title = `${item.brand} ${item.model}`;
  const upcomingLoans = item.loanRequests
    .filter((loan) => loan.status === "APROVADA" && loan.endDate >= new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/inventari" className="text-sm text-muted-foreground hover:underline">
          &larr; {canManage ? "Tot l'inventari" : "Material prestable"}
        </Link>

        <div className="mt-3 flex flex-col gap-5 rounded-lg border bg-background p-5 sm:flex-row">
          <div className="relative flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={title} fill sizes="160px" className="object-cover" />
            ) : (
              <PackageIcon className="size-10 text-muted-foreground" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="text-muted-foreground">{item.category.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.isLoanable && <Badge variant="secondary">Prestable</Badge>}
                <Badge variant={inventoryItemStatusVariants[item.status]}>
                  {inventoryItemStatusLabels[item.status]}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <DataRow label="Ubicació" value={item.space?.name ?? "—"} />
              <DataRow label="Núm. de sèrie" value={item.serialNumber ?? "—"} />
              {canManage && (
                <>
                  <DataRow
                    label="Data de compra"
                    value={item.purchaseDate ? formatDate(item.purchaseDate) : "—"}
                  />
                  <DataRow
                    label="Garantia fins"
                    value={item.warrantyUntil ? formatDate(item.warrantyUntil) : "—"}
                  />
                  <DataRow label="Alta a l'inventari" value={formatDate(item.createdAt)} />
                </>
              )}
            </div>

            {canManage && item.notes && (
              <>
                <Separator />
                <DataRow label="Notes" value={<span className="whitespace-pre-line">{item.notes}</span>} />
              </>
            )}

            {!canManage && item.status === "ACTIU" && (
              <div>
                <LoanRequestDialog itemId={item.id} itemLabel={title} />
              </div>
            )}
          </div>
        </div>
      </div>

      {canManage ? (
        <ItemLoanHistory loans={item.loanRequests} />
      ) : (
        <ItemAvailability
          upcoming={upcomingLoans}
          mine={item.loanRequests.filter((loan) => loan.requesterId === user.id)}
        />
      )}

      <ItemIncidentHistory
        itemId={item.id}
        incidents={
          canManage
            ? item.incidents
            : item.incidents.filter((incident) => incident.reporterId === user.id)
        }
        showReporter={canManage}
      />
    </div>
  );
}
