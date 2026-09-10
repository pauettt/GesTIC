import type { Route } from "next";
import Link from "next/link";
import { HandCoinsIcon } from "lucide-react";

import { db } from "@/lib/db";
import { inventorySearchFilter } from "@/lib/inventory-search";
import { isAdmin, requireUser } from "@/lib/permissions";
import { inventoryItemStatusLabels, inventoryItemStatusVariants } from "@/lib/labels";
import {
  deleteInventoryCategory,
  deleteInventoryItem,
  reorderInventoryCategory,
  upsertInventoryCategory,
} from "@/actions/inventory";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { InventoryItemDialog } from "@/components/inventory/inventory-item-dialog";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { LoanableItemsView } from "@/components/inventory/loanable-items-view";
import { ActiveLoans, PendingLoanRequests } from "@/components/inventory/loan-queues";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Inventari TIC" };

export default async function InventariPage({ searchParams }: PageProps<"/inventari">) {
  const user = await requireUser();

  const { q } = await searchParams;
  const search = inventorySearchFilter(typeof q === "string" ? q : undefined);

  // El professorat té una pantalla pròpia: només el material que pot demanar.
  if (!isAdmin(user.role)) {
    const [items, myRequests] = await Promise.all([
      db.inventoryItem.findMany({
        where: { isLoanable: true, status: "ACTIU", ...search },
        include: { space: true, category: true },
        orderBy: [{ brand: "asc" }],
      }),
      db.loanRequest.findMany({
        where: { requesterId: user.id },
        include: { item: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return <LoanableItemsView items={items} myRequests={myRequests} />;
  }

  const { category: categoryFilter, prestable } = await searchParams;
  const onlyLoanable = prestable === "1";

  const [items, spaces, categories, pendingLoanRequests, activeLoanRequests] = await Promise.all([
    db.inventoryItem.findMany({
      where: {
        ...(typeof categoryFilter === "string" ? { categoryId: categoryFilter } : {}),
        ...(onlyLoanable ? { isLoanable: true } : {}),
        ...search,
      },
      include: { space: true, category: true },
      orderBy: [{ status: "asc" }, { brand: "asc" }],
    }),
    db.space.findMany({ orderBy: { name: "asc" } }),
    db.inventoryCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { items: true } } },
    }),
    db.loanRequest.findMany({
      where: { status: "PENDENT" },
      include: { item: true, requester: true },
      orderBy: { createdAt: "asc" },
    }),
    db.loanRequest.findMany({
      where: { status: "APROVADA" },
      include: { item: true, requester: true },
      // Els que venien abans primer: així els endarrerits queden a dalt.
      orderBy: { endDate: "asc" },
    }),
  ]);

  function filterHref(next: { category?: string; prestable?: boolean }): Route {
    const params = new URLSearchParams();
    const nextCategory = next.category !== undefined ? next.category : (categoryFilter as string | undefined);
    const nextPrestable = next.prestable !== undefined ? next.prestable : onlyLoanable;
    if (nextCategory) params.set("category", nextCategory);
    if (nextPrestable) params.set("prestable", "1");
    if (typeof q === "string" && q) params.set("q", q);
    const query = params.toString();
    return (query ? `/inventari?${query}` : "/inventari") as Route;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventari TIC</h1>
          <p className="text-muted-foreground">Equipament TIC del centre.</p>
        </div>
        <InventoryItemDialog spaces={spaces} categories={categories} />
      </div>

      <InventorySearch placeholder="Cerca per marca, model, núm. de sèrie o aula…" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            nativeButton={false}
            variant={!categoryFilter ? "default" : "outline"}
            render={<Link href={filterHref({ category: "" })} />}
          >
            Totes
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              size="sm"
              nativeButton={false}
              variant={categoryFilter === category.id ? "default" : "outline"}
              render={<Link href={filterHref({ category: category.id })} />}
            >
              {category.name}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            nativeButton={false}
            variant={onlyLoanable ? "default" : "outline"}
            render={<Link href={filterHref({ prestable: !onlyLoanable })} />}
          >
            <HandCoinsIcon className="size-4" />
            Només prestable
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <CategoryManagerDialog
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              order: category.order,
              usageCount: category._count.items,
            }))}
            upsertAction={upsertInventoryCategory}
            deleteAction={deleteInventoryCategory}
            reorderAction={reorderInventoryCategory}
            title="Categories d'inventari"
            description="Ordena, reanomena o elimina les categories de l'equipament."
            itemNounSingular="equip"
            itemNounPlural="equips"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equip</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ubicació</TableHead>
              <TableHead>Núm. sèrie</TableHead>
              <TableHead>Prestable</TableHead>
              <TableHead>Estat</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Cap equip coincideix amb aquest filtre.
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
                <TableCell className="text-muted-foreground">{item.serialNumber ?? "—"}</TableCell>
                <TableCell>
                  {item.isLoanable ? (
                    <Badge variant="secondary">Prestable</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={inventoryItemStatusVariants[item.status]}>
                    {inventoryItemStatusLabels[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <InventoryItemDialog
                      spaces={spaces}
                      categories={categories}
                      item={{
                        id: item.id,
                        categoryId: item.categoryId,
                        brand: item.brand,
                        model: item.model,
                        serialNumber: item.serialNumber ?? "",
                        spaceId: item.spaceId ?? "",
                        status: item.status,
                        isLoanable: item.isLoanable,
                        imageUrl: item.imageUrl ?? "",
                        purchaseDate: item.purchaseDate?.toISOString().slice(0, 10) ?? "",
                        warrantyUntil: item.warrantyUntil?.toISOString().slice(0, 10) ?? "",
                        notes: item.notes ?? "",
                      }}
                      trigger={
                        <button className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
                          Edita
                        </button>
                      }
                    />
                    <ConfirmDeleteButton
                      action={deleteInventoryItem}
                      input={{ id: item.id }}
                      title="Eliminar aquest equip?"
                      description="S'eliminarà de l'inventari de forma permanent."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PendingLoanRequests requests={pendingLoanRequests} />
      <ActiveLoans loans={activeLoanRequests} />
    </div>
  );
}
