"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import type { DeviceType } from "@prisma/client";

import { importCartChromebooks } from "@/actions/chromebook-import";
import { CART_SHEET_FIELDS, planCartImport, type ExistingInventory } from "@/lib/chromebook-import";
import { deviceTypeLabels } from "@/lib/devices";
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
 * Els dispositius d'un carro des del full de càlcul on es tenen documentats:
 * una fila per equip, amb l'etiqueta, i el tipus, el número de sèrie, la marca
 * i el model si n'hi ha. Els que ja són a gesTIC no es tornen a crear.
 */
export function CartImportDialog({
  cartId,
  cartName,
  existing,
  triggerVariant = "outline",
}: {
  cartId: string;
  cartName: string;
  existing: Pick<ExistingInventory, "assetTags" | "serialNumbers">;
  triggerVariant?: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  const { sheet, error, readFile, setColumn, clear } = useSheet(CART_SHEET_FIELDS);
  const [defaultDeviceType, setDefaultDeviceType] = useState<DeviceType | null>(null);
  const [isImporting, startImport] = useTransition();

  function handleOpenChange(next: boolean) {
    clear();
    setDefaultDeviceType(null);
    setOpen(next);
  }

  const plan = sheet
    ? planCartImport(sheet.rows, { headerRow: sheet.headerRow, mapping: sheet.mapping, defaultDeviceType }, existing)
    : null;
  const hasTagColumn = sheet?.mapping.assetTag !== undefined;
  const issues = plan ? [...plan.errors, ...plan.duplicates].sort((a, b) => a.row - b.row) : [];
  const toImport = plan?.chromebooks.length ?? 0;
  // Si no, s'importarien només les files que diuen el tipus, i les altres quedarien enrere sense adonar-se'n.
  const typeMissing = (plan?.withoutType ?? 0) > 0 && defaultDeviceType === null;

  function submit() {
    if (!sheet) return;
    startImport(async () => {
      try {
        const result = await importCartChromebooks({
          cartId,
          rows: sheet.rows,
          headerRow: sheet.headerRow,
          mapping: sheet.mapping,
          defaultDeviceType,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`S'han afegit ${count(result.chromebooks, "dispositiu", "dispositius")} a ${cartName}`);
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
          <Button variant={triggerVariant} size="sm">
            <UploadIcon className="size-4" />
            Importa des d&apos;un full
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importa els dispositius de {cartName}</DialogTitle>
          <DialogDescription>
            Un full amb una fila per dispositiu: l&apos;etiqueta i, si en teniu, el tipus, el número de sèrie, la
            marca i el model. A Excel: Fitxer → Desa com a → CSV. A Google Sheets: Fitxer → Baixa → Valors separats
            per comes (.csv).
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
              <ColumnMappingFields sheet={sheet} fields={CART_SHEET_FIELDS} onChange={setColumn} />
              {!hasTagColumn && (
                <p role="alert" className="text-sm text-destructive">
                  Tria la columna de l&apos;etiqueta: és com es coneix cada dispositiu al carro.
                </p>
              )}
            </section>

            <DefaultDeviceTypeField
              withoutType={plan.withoutType}
              value={defaultDeviceType}
              onChange={setDefaultDeviceType}
            />

            <section className="grid grid-cols-2 gap-2">
              <Stat label="Dispositius per afegir" value={toImport} />
              <Stat label="Files que no s'importen" value={issues.length} muted={issues.length === 0} />
            </section>

            {toImport > 0 && (
              <div className="max-h-72 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead>Tipus</TableHead>
                      <TableHead>Núm. sèrie</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Model</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.chromebooks.map((chromebook) => (
                      <TableRow key={chromebook.row}>
                        <TableCell className="font-medium">{chromebook.assetTag}</TableCell>
                        <TableCell>{deviceTypeLabels[chromebook.deviceType]}</TableCell>
                        <TableCell className="text-muted-foreground">{chromebook.serialNumber ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{chromebook.brand ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{chromebook.model ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <IssueList issues={issues} />

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={clear} disabled={isImporting}>
                Tria un altre fitxer
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={isImporting || !hasTagColumn || toImport === 0 || typeMissing}
              >
                {isImporting ? "Important…" : `Afegeix ${count(toImport, "dispositiu", "dispositius")}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
