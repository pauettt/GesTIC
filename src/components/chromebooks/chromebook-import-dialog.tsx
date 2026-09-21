"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import type { DeviceType } from "@prisma/client";

import { importChromebooks } from "@/actions/chromebook-import";
import {
  CHROMEBOOK_FIELDS,
  planChromebookImport,
  type ExistingInventory,
  type RowsWithoutCart,
} from "@/lib/chromebook-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ColumnMappingFields,
  count,
  DefaultDeviceTypeField,
  IssueList,
  SheetFilePicker,
  Stat,
  useSheet,
} from "@/components/chromebooks/import-sheet";

/**
 * Importació de carros i Chromebooks des d'un full de càlcul. Les columnes es
 * reconeixen soles pel títol i es poden reassignar; la vista prèvia diu què es
 * crearà abans de crear-ho.
 */
export function ChromebookImportDialog({ existing }: { existing: ExistingInventory }) {
  const [open, setOpen] = useState(false);
  const { sheet, error, readFile, setColumn, clear } = useSheet(CHROMEBOOK_FIELDS);
  const [withoutCart, setWithoutCart] = useState<RowsWithoutCart>("pool");
  const [defaultDeviceType, setDefaultDeviceType] = useState<DeviceType | null>(null);
  const [isImporting, startImport] = useTransition();

  function handleOpenChange(next: boolean) {
    clear();
    setWithoutCart("pool");
    setDefaultDeviceType(null);
    setOpen(next);
  }

  const plan = sheet
    ? planChromebookImport(
        sheet.rows,
        { headerRow: sheet.headerRow, mapping: sheet.mapping, withoutCart, defaultDeviceType },
        existing,
      )
    : null;
  const identifiable =
    sheet !== null &&
    (sheet.mapping.cart !== undefined ||
      sheet.mapping.serialNumber !== undefined ||
      sheet.mapping.assetTag !== undefined);
  const issues = plan ? [...plan.errors, ...plan.duplicates].sort((a, b) => a.row - b.row) : [];
  const poolCount = plan?.chromebooks.filter((chromebook) => chromebook.cartName === null).length ?? 0;
  const newCarts = plan?.carts.filter((cart) => !cart.exists && cart.chromebooks > 0).length ?? 0;
  const toImport = plan?.chromebooks.length ?? 0;
  // Si no, s'importarien només les files que diuen el tipus, i les altres quedarien enrere sense adonar-se'n.
  const typeMissing = (plan?.withoutType ?? 0) > 0 && defaultDeviceType === null;

  function submit() {
    if (!sheet) return;
    startImport(async () => {
      try {
        const result = await importChromebooks({
          rows: sheet.rows,
          headerRow: sheet.headerRow,
          mapping: sheet.mapping,
          withoutCart,
          defaultDeviceType,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const created = [
          count(result.chromebooks, "dispositiu", "dispositius"),
          result.carts > 0 && count(result.carts, "carro nou", "carros nous"),
          result.spaces > 0 && count(result.spaces, "aula nova", "aules noves"),
        ].filter(Boolean);
        toast.success(`S'han importat ${created.join(", ")}`);
        handleOpenChange(false);
      } catch (caught) {
        unstable_rethrow(caught);
        toast.error("No s'ha pogut importar. Comprova la connexió i torna-ho a provar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <UploadIcon className="size-4" />
            Importa
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importa carros i dispositius</DialogTitle>
          <DialogDescription>
            Des d&apos;un full amb una fila per dispositiu (Chromebook, portàtil, iPad…). A Google Sheets: Fitxer → Baixa → Valors separats per
            comes (.csv). Les aules i els carros que encara no existeixin es creen.
          </DialogDescription>
        </DialogHeader>

        {!sheet || !plan ? (
          <SheetFilePicker error={error} onFile={(file) => void readFile(file)} />
        ) : (
          <div className="flex min-w-0 flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                Columnes de {sheet.fileName}{" "}
                <span className="font-normal text-muted-foreground">(les que no surtin bé, tria-les)</span>
              </h3>
              <ColumnMappingFields sheet={sheet} fields={CHROMEBOOK_FIELDS} onChange={setColumn} />
              {!identifiable && (
                <p role="alert" className="text-sm text-destructive">
                  Tria com a mínim la columna del carro o la del número de sèrie.
                </p>
              )}
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Dispositius per importar" value={toImport} />
              <Stat label="Carros nous" value={newCarts} />
              <Stat label="Aules noves" value={plan.newSpaces.length} />
              <Stat label="Files que no s'importen" value={issues.length} muted={issues.length === 0} />
            </section>

            <DefaultDeviceTypeField
              withoutType={plan.withoutType}
              value={defaultDeviceType}
              onChange={setDefaultDeviceType}
            />

            {plan.withoutCart > 0 && (
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <p className="text-sm">
                  <span className="font-medium">
                    {count(plan.withoutCart, "equip no és", "equips no són")} de cap carro.
                  </span>{" "}
                  Què se&apos;n fa?
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Equips sense carro">
                  <Button
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={withoutCart === "pool"}
                    variant={withoutCart === "pool" ? "default" : "outline"}
                    onClick={() => setWithoutCart("pool")}
                  >
                    Al préstec a l&apos;alumnat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={withoutCart === "skip"}
                    variant={withoutCart === "skip" ? "default" : "outline"}
                    onClick={() => setWithoutCart("skip")}
                  >
                    No els importis
                  </Button>
                </div>
              </section>
            )}

            {(plan.carts.length > 0 || poolCount > 0) && (
              <div className="max-h-72 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carro</TableHead>
                      <TableHead>Aula</TableHead>
                      <TableHead className="text-right">Dispositius nous</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.carts.map((cart) => (
                      <TableRow key={cart.name}>
                        <TableCell className="font-medium">
                          {cart.name}
                          {cart.exists && (
                            <Badge variant="outline" className="ml-2">
                              Ja existeix
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cart.spaceName ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{cart.chromebooks}</TableCell>
                      </TableRow>
                    ))}
                    {poolCount > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Préstec a l&apos;alumnat</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-right tabular-nums">{poolCount}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <IssueList issues={issues} />

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={clear} disabled={isImporting}>
                Tria un altre fitxer
              </Button>
              <Button type="button" onClick={submit} disabled={isImporting || !identifiable || toImport === 0 || typeMissing}>
                {isImporting ? "Important…" : `Importa ${count(toImport, "dispositiu", "dispositius")}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
