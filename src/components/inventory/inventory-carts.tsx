import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type InventoryCart = {
  id: string;
  name: string;
  serialNumber: string | null;
  space: { name: string } | null;
  /** Què porta: «28 Chromebooks · 2 iPads». Buit si no porta res. */
  summary: string;
};

/**
 * Els carros que hi ha on es mira l'inventari. Són a la seva secció, però qui
 * busca què hi ha en una aula també els hi ha de trobar.
 */
export function InventoryCarts({ title, carts }: { title: string; carts: InventoryCart[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carro</TableHead>
              <TableHead>Dispositius</TableHead>
              <TableHead>Ubicació</TableHead>
              <TableHead>Núm. sèrie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carts.map((cart) => (
              <TableRow key={cart.id}>
                <TableCell className="font-medium">
                  <Link href={`/chromebooks/${cart.id}`} className="hover:underline">
                    {cart.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{cart.summary || "Cap dispositiu"}</TableCell>
                <TableCell className="text-muted-foreground">{cart.space?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{cart.serialNumber ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
