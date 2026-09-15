"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import type { DeviceType } from "@prisma/client";

import { importChromebooks } from "@/actions/chromebook-import";
import {
  CHROMEBOOK_FIELDS,
  CHROMEBOOK_FIELD_LABELS,
  detectColumns,
  planChromebookImport,
  type ChromebookField,
  type ColumnMapping,
  type ExistingInventory,
  type RowsWithoutCart,
} from "@/lib/chromebook-import";
import { parseCsv } from "@/lib/csv";
import { DEVICE_TYPES, deviceTypeLabels } from "@/lib/devices";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Sheet = { fileName: string; rows: string[][]; headerRow: number; mapping: ColumnMapping };

const NO_COLUMN = "none";

function columnLetter(index: number) {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className={cn("text-2xl font-semibold tabular-nums", muted && "text-muted-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Importació de carros i Chromebooks des d'un full de càlcul. Les columnes es
 * reconeixen soles pel títol i es poden reassignar; la vista prèvia diu què es
 * crearà abans de crear-ho.
 */
export function ChromebookImportDialog({ existing }: { existing: ExistingInventory }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [withoutCart, setWithoutCart] = useState<RowsWithoutCart>("pool");
  const [defaultDeviceType, setDefaultDeviceType] = useState<DeviceType>("CHROMEBOOK");
  const [error, setError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();

  function handleOpenChange(next: boolean) {
    setSheet(null);
    setError(null);
    setWithoutCart("pool");
    setDefaultDeviceType("CHROMEBOOK");
    setOpen(next);
  }

  async function readFile(file: File) {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setSheet(null);
      setError("El fitxer no té cap fila de dades.");
      return;
    }
    const { headerRow, mapping } = detectColumns(rows);
    setError(null);
    setSheet({ fileName: file.name, rows, headerRow, mapping });
  }

  function setColumn(field: ChromebookField, value: string) {
    setSheet(
      (current) =>
        current && {
          ...current,
          mapping: { ...current.mapping, [field]: value === NO_COLUMN ? undefined : Number(value) },
        },
    );
  }

  const plan = sheet
    ? planChromebookImport(
        sheet.rows,
        { headerRow: sheet.headerRow, mapping: sheet.mapping, withoutCart, defaultDeviceType },
        existing,
      )
    : null;
  const headers = sheet?.rows[sheet.headerRow] ?? [];
  const columnItems: Record<string, string> = {
    [NO_COLUMN]: "Cap columna",
    ...Object.fromEntries(
      headers.map((header, index) => [String(index), `${columnLetter(index)} · ${header.trim() || "(sense títol)"}`]),
    ),
  };
  const identifiable =
    sheet !== null &&
    (sheet.mapping.cart !== undefined ||
      sheet.mapping.serialNumber !== undefined ||
      sheet.mapping.assetTag !== undefined);
  const issues = plan ? [...plan.errors, ...plan.duplicates].sort((a, b) => a.row - b.row) : [];
  const poolCount = plan?.chromebooks.filter((chromebook) => chromebook.cartName === null).length ?? 0;
  const newCarts = plan?.carts.filter((cart) => !cart.exists && cart.chromebooks > 0).length ?? 0;
  const toImport = plan?.chromebooks.length ?? 0;

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
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-muted/40">
              <FileSpreadsheetIcon className="size-8" />
              <span>Tria el fitxer .csv</span>
              <Input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                }}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                Columnes de {sheet.fileName}{" "}
                <span className="font-normal text-muted-foreground">(les que no surtin bé, tria-les)</span>
              </h3>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {CHROMEBOOK_FIELDS.map((field) => (
                  <div key={field} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{CHROMEBOOK_FIELD_LABELS[field]}</span>
                    <Select
                      value={String(sheet.mapping[field] ?? NO_COLUMN)}
                      onValueChange={(value) => setColumn(field, String(value ?? NO_COLUMN))}
                      items={columnItems}
                    >
                      <SelectTrigger className="w-56" aria-label={CHROMEBOOK_FIELD_LABELS[field]}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_COLUMN}>Cap columna</SelectItem>
                        {headers.map((_, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {columnItems[String(index)]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {!identifiable && (
                <p role="alert" className="text-sm text-destructive">
                  Tria com a mínim la columna del carro o la del número de sèrie.
                </p>
              )}
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm sm:max-w-[calc(50%-0.75rem)]">
                <span className="text-muted-foreground">Tipus quan el full no ho diu</span>
                <Select
                  value={defaultDeviceType}
                  onValueChange={(value) => setDefaultDeviceType((value ?? "CHROMEBOOK") as DeviceType)}
                  items={deviceTypeLabels}
                >
                  <SelectTrigger className="w-56" aria-label="Tipus quan el full no ho diu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {deviceTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Dispositius per importar" value={toImport} />
              <Stat label="Carros nous" value={newCarts} />
              <Stat label="Aules noves" value={plan.newSpaces.length} />
              <Stat label="Files que no s'importen" value={issues.length} muted={issues.length === 0} />
            </section>

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

            {issues.length > 0 && (
              <section className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <h3 className="font-medium">{count(issues.length, "fila no s'importarà", "files no s'importaran")}</h3>
                <ul className="max-h-40 overflow-auto text-muted-foreground">
                  {issues.map((issue) => (
                    <li key={`${issue.row}-${issue.message}`}>
                      Fila {issue.row}: {issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSheet(null)} disabled={isImporting}>
                Tria un altre fitxer
              </Button>
              <Button type="button" onClick={submit} disabled={isImporting || !identifiable || toImport === 0}>
                {isImporting ? "Important…" : `Importa ${count(toImport, "dispositiu", "dispositius")}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
