"use client";

import { Fragment, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { importCredentials } from "@/actions/credentials";
import { parseCredentialSheet, type ImportedCredential } from "@/lib/credential-import";
import { parseCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = ImportedCredential & { superAdminOnly: boolean; duplicate: boolean };
type Sheet = { fileName: string; rows: Row[]; skipped: number };

function rowKey(row: Pick<ImportedCredential, "category" | "name" | "username">) {
  return [row.category, row.name, row.username].join("|").toLowerCase();
}

/**
 * Importació del full de contrasenyes. El fitxer es llegeix aquí, al navegador,
 * i es revisa abans d'enviar-lo: què s'importa, a quina categoria, què ja hi és
 * i quines ha de veure només el superadministrador.
 */
export function CredentialImportDialog({ existingKeys }: { existingKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();

  function handleOpenChange(next: boolean) {
    // Tancar el diàleg oblida el full: les contrasenyes no es queden a la memòria de la pàgina.
    setSheet(null);
    setError(null);
    setOpen(next);
  }

  async function readFile(file: File) {
    const result = parseCredentialSheet(parseCsv(await file.text()));
    if (!result.ok) {
      setSheet(null);
      setError(result.error);
      return;
    }
    if (result.credentials.length === 0) {
      setSheet(null);
      setError("El full no té cap contrasenya per importar.");
      return;
    }
    const existing = new Set(existingKeys);
    setError(null);
    setSheet({
      fileName: file.name,
      skipped: result.skipped,
      rows: result.credentials.map((row) => ({
        ...row,
        superAdminOnly: false,
        duplicate: existing.has(rowKey(row)),
      })),
    });
  }

  function setRestricted(predicate: (row: Row) => boolean, value: boolean) {
    setSheet((current) =>
      current && {
        ...current,
        rows: current.rows.map((row) => (predicate(row) ? { ...row, superAdminOnly: value } : row)),
      },
    );
  }

  const toImport = sheet?.rows.filter((row) => !row.duplicate) ?? [];
  const duplicates = (sheet?.rows.length ?? 0) - toImport.length;
  const categories = [...new Set(sheet?.rows.map((row) => row.category) ?? [])];

  function submit() {
    startImport(async () => {
      try {
        const result = await importCredentials({
          credentials: toImport.map((row) => ({
            category: row.category,
            name: row.name,
            username: row.username,
            password: row.password,
            url: row.url,
            notes: row.notes,
            superAdminOnly: row.superAdminOnly,
          })),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          `S'han importat ${result.created} ${result.created === 1 ? "contrasenya" : "contrasenyes"}` +
            (result.skipped > 0 ? ` (${result.skipped} ja hi eren)` : ""),
        );
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
          <Button variant="outline" size="sm">
            <UploadIcon className="size-4" />
            Importa
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importa el full de contrasenyes</DialogTitle>
          <DialogDescription>
            A Google Sheets, obre el full i fes Fitxer → Baixa → Valors separats per comes (.csv). Quan
            l&apos;hagis importat, esborra el fitxer de Baixades.
          </DialogDescription>
        </DialogHeader>

        {!sheet ? (
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
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-sm">
              <span className="font-medium">{sheet.fileName}</span>: {toImport.length} per importar en{" "}
              {categories.length} {categories.length === 1 ? "categoria" : "categories"}
              {duplicates > 0 && ` · ${duplicates} ja hi són i no es tornaran a importar`}
              {sheet.skipped > 0 && ` · ${sheet.skipped} files sense nom s'ignoren`}.
            </p>
            <div className="max-h-[50vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Usuari</TableHead>
                    <TableHead>Contrasenya</TableHead>
                    <TableHead className="w-36">Només superadmin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const rows = sheet.rows.filter((row) => row.category === category);
                    const importable = rows.filter((row) => !row.duplicate);
                    const allRestricted = importable.length > 0 && importable.every((row) => row.superAdminOnly);
                    return (
                      <Fragment key={category}>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">
                            {category}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              aria-label={`Només superadmin: tota la categoria ${category}`}
                              checked={allRestricted}
                              disabled={importable.length === 0}
                              onCheckedChange={(value) =>
                                setRestricted((row) => row.category === category && !row.duplicate, value === true)
                              }
                            />
                          </TableCell>
                        </TableRow>
                        {rows.map((row, index) => (
                          <TableRow key={`${category}-${index}`} className={row.duplicate ? "opacity-60" : undefined}>
                            <TableCell className="font-medium">
                              {row.name}
                              {row.duplicate && (
                                <Badge variant="outline" className="ml-2">
                                  Ja hi és
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.username || "—"}</TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {row.password ? "••••••" : "—"}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                aria-label={`Només superadmin: ${row.name}`}
                                checked={row.superAdminOnly}
                                disabled={row.duplicate}
                                onCheckedChange={(value) => setRestricted((other) => other === row, value === true)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSheet(null)} disabled={isImporting}>
                Tria un altre fitxer
              </Button>
              <Button type="button" onClick={submit} disabled={isImporting || toImport.length === 0}>
                {isImporting
                  ? "Important…"
                  : `Importa ${toImport.length} ${toImport.length === 1 ? "contrasenya" : "contrasenyes"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
