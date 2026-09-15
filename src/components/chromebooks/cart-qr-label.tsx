import type { Route } from "next";
import Link from "next/link";

import { cartQrPath, generateQrDataUrl } from "@/lib/qr";
import { getBaseUrl, isBaseUrlGuessed } from "@/lib/url";
import { PrintButton } from "@/components/shared/print-button";

/**
 * L'etiqueta QR d'un carro, grossa, per enganxar-la en un lloc visible del carro.
 * En escanejar-la, el professorat veu tots els dispositius i reporta l'avaria del
 * que no funciona. Cada dispositiu només ha de portar visible el seu número.
 */
export async function CartQrLabel({
  cartId,
  cartName,
  spaceName,
}: {
  cartId: string;
  cartName: string;
  spaceName: string | null;
}) {
  const baseUrl = await getBaseUrl();
  const guessed = isBaseUrlGuessed();
  const qr = await generateQrDataUrl(`${baseUrl}${cartQrPath(cartId)}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex max-w-2xl flex-col gap-1">
          <Link href={`/chromebooks/${cartId}` as Route} className="text-sm text-muted-foreground hover:underline">
            &larr; Torna al carro
          </Link>
          <h1 className="text-2xl font-semibold">QR del carro — {cartName}</h1>
          <p className="text-muted-foreground">
            Enganxa&apos;l al carro, en un lloc visible. En escanejar-lo, el professorat veu tots els
            dispositius amb el seu estat i reporta l&apos;avaria del que no funciona. Cada dispositiu només
            ha de portar visible el seu número.
          </p>
          <Link
            href={`/chromebooks/${cartId}/etiquetes?equips=1` as Route}
            className="text-sm text-muted-foreground hover:underline"
          >
            Prefereixes una etiqueta per a cada dispositiu? Imprimeix-les aquí
          </Link>
        </div>
        <PrintButton />
      </div>

      {guessed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm print:hidden">
          <p className="font-medium text-destructive">No imprimeixis encara</p>
          <p className="text-muted-foreground">
            El QR apunta a <code>{baseUrl}</code> perquè no hi ha cap domini fixat. Un cop enganxat al carro
            no es pot canviar: configura <code>APP_URL</code> amb l&apos;adreça definitiva del centre abans
            d&apos;imprimir.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-xl border-2 p-6 text-center print:break-inside-avoid">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL generat en servidor, no cal optimització d'imatge */}
          <img src={qr} alt={`QR ${cartName}`} className="size-64" />
          <span className="text-2xl font-semibold">{cartName}</span>
          {spaceName && <span className="text-muted-foreground">{spaceName}</span>}
          <span className="text-sm">Escaneja&apos;m per reportar una avaria</span>
        </div>
      </div>
    </div>
  );
}
