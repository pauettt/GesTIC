import type { ChromebookStatus } from "@prisma/client";

import { deleteChromebook } from "@/actions/chromebooks";
import { chromebookStatusLabels, chromebookStatusVariants } from "@/lib/labels";
import { StudentChromebookDialog } from "@/components/chromebooks/student-chromebook-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PoolChromebook = {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: ChromebookStatus;
};

/**
 * Els equips que es deixen a un alumne per a tot el curs. Van en una taula i no
 * en la graella de quadrats dels carros: aquella dibuixa el carro tal com és
 * per dins, i aquí el que importa és el número de sèrie i qui el té.
 *
 * Només la coordinació TIC: és el seu inventari de préstec.
 */
export function StudentChromebookPool({ chromebooks }: { chromebooks: PoolChromebook[] }) {
  const available = chromebooks.filter((cb) => cb.status === "DISPONIBLE").length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Chromebooks de préstec a l&apos;alumnat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Equips que no són de cap carro i que es deixen a un alumne per a tot el curs.{" "}
            {chromebooks.length > 0 && (
              <>
                <span className="font-medium text-foreground">{available}</span> de{" "}
                {chromebooks.length} lliures.
              </>
            )}
          </p>
        </div>
        <StudentChromebookDialog />
      </CardHeader>
      <CardContent>
        {chromebooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha cap equip al pool de préstec. Afegeix-n&apos;hi amb el botó de dalt:
            els que hi posis seran els que es podran assignar a un alumne.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Marca i model</TableHead>
                  <TableHead>Núm. de sèrie</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead className="w-24 text-right">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chromebooks.map((chromebook) => (
                  <TableRow key={chromebook.id}>
                    <TableCell className="font-medium">{chromebook.assetTag}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[chromebook.brand, chromebook.model].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {chromebook.serialNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={chromebookStatusVariants[chromebook.status]}>
                        {chromebookStatusLabels[chromebook.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <StudentChromebookDialog
                          chromebook={{
                            id: chromebook.id,
                            assetTag: chromebook.assetTag,
                            serialNumber: chromebook.serialNumber ?? "",
                            brand: chromebook.brand ?? "",
                            model: chromebook.model ?? "",
                          }}
                          trigger={
                            <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                              Edita
                            </button>
                          }
                        />
                        <ConfirmDeleteButton
                          action={deleteChromebook}
                          input={{ id: chromebook.id }}
                          title="Eliminar aquest Chromebook?"
                          description="Desapareixerà del pool de préstec. Si està assignat a un alumne, primer cal registrar-ne la devolució."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
