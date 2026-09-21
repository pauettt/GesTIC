"use client";

import { useState } from "react";
import { FileSpreadsheetIcon } from "lucide-react";
import type { DeviceType } from "@prisma/client";

import {
  CHROMEBOOK_FIELD_LABELS,
  detectColumns,
  type ChromebookField,
  type ColumnMapping,
  type ImportIssue,
} from "@/lib/chromebook-import";
import { decodeCsvBytes, parseCsv } from "@/lib/csv";
import { DEVICE_TYPES, deviceTypeLabels } from "@/lib/devices";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Les peces que comparteixen les importacions de dispositius des d'un full de
 * càlcul en CSV: la general (Carros → Importa) i la d'un sol carro.
 */

export type Sheet = { fileName: string; rows: string[][]; headerRow: number; mapping: ColumnMapping };

const NO_COLUMN = "none";

export function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function columnLetter(index: number) {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

/** El fitxer triat, amb les columnes reconegudes pel títol i les que s'hi reassignen a mà. */
export function useSheet(fields: readonly ChromebookField[]) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File) {
    const rows = parseCsv(decodeCsvBytes(await file.arrayBuffer()));
    if (rows.length < 2) {
      setSheet(null);
      setError("El fitxer no té cap fila de dades.");
      return;
    }
    const { headerRow, mapping } = detectColumns(rows, fields);
    setError(null);
    setSheet({ fileName: file.name, rows, headerRow, mapping });
  }

  function setColumn(field: ChromebookField, column: number | undefined) {
    setSheet((current) => current && { ...current, mapping: { ...current.mapping, [field]: column } });
  }

  function clear() {
    setSheet(null);
    setError(null);
  }

  return { sheet, error, readFile, setColumn, clear };
}

export function SheetFilePicker({ error, onFile }: { error: string | null; onFile: (file: File) => void }) {
  return (
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
            if (file) onFile(file);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ColumnMappingFields({
  sheet,
  fields,
  onChange,
}: {
  sheet: Sheet;
  fields: readonly ChromebookField[];
  onChange: (field: ChromebookField, column: number | undefined) => void;
}) {
  const headers = sheet.rows[sheet.headerRow] ?? [];
  const columnItems: Record<string, string> = {
    [NO_COLUMN]: "Cap columna",
    ...Object.fromEntries(
      headers.map((header, index) => [String(index), `${columnLetter(index)} · ${header.trim() || "(sense títol)"}`]),
    ),
  };

  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{CHROMEBOOK_FIELD_LABELS[field]}</span>
          <Select
            value={String(sheet.mapping[field] ?? NO_COLUMN)}
            onValueChange={(value) => onChange(field, !value || value === NO_COLUMN ? undefined : Number(value))}
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
  );
}

/**
 * El tipus de les files que no el diuen. No se'n suposa cap: fins que no se'n
 * tria un, aquestes files no s'importen.
 */
export function DefaultDeviceTypeField({
  withoutType,
  value,
  onChange,
}: {
  withoutType: number;
  value: DeviceType | null;
  onChange: (value: DeviceType | null) => void;
}) {
  if (withoutType === 0) return null;
  const items = [
    { value: null, label: "Tria el tipus…" },
    ...DEVICE_TYPES.map((type) => ({ value: type, label: deviceTypeLabels[type] })),
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm",
        !value && "border-destructive/50 bg-destructive/5",
      )}
    >
      <p>
        <span className="font-medium">
          {count(withoutType, "fila no diu", "files no diuen")} quin tipus de dispositiu{" "}
          {withoutType === 1 ? "és" : "són"}.
        </span>{" "}
        {value ? "Totes seran:" : "Tria què són:"}
      </p>
      <Select
        value={value}
        onValueChange={(next) => onChange((next as DeviceType | null) ?? null)}
        items={items}
      >
        <SelectTrigger className="w-56" aria-label="Tipus de les files que no el diuen">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value ?? ""} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className={cn("text-2xl font-semibold tabular-nums", muted && "text-muted-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function IssueList({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  return (
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
  );
}
