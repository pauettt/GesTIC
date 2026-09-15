import type { Route } from "next";
import Link from "next/link";

import { chromebookQrPath, generateQrDataUrl } from "@/lib/qr";
import { getBaseUrl, isBaseUrlGuessed } from "@/lib/url";
import { PrintButton } from "@/components/shared/print-button";

/**
 * Full d'etiquetes QR per enganxar als Chromebooks. El fan servir els carros i
 * el pool de préstec a l'alumnat: per això rep d'on es torna i el text de sota
 * cada etiqueta, en comptes de saber d'on ve.
 */
export async function QrLabelSheet({
  title,
  backHref,
  backLabel,
  caption,
  chromebooks,
}: {
  title: string;
  backHref: Route;
  backLabel: string;
  /** Text petit sota l'identificador: el nom del carro, o que és de préstec. */
  caption: string;
  chromebooks: { id: string; assetTag: string }[];
}) {
  const baseUrl = await getBaseUrl();
  const guessed = isBaseUrlGuessed();
  const labels = await Promise.all(
    chromebooks.map(async (chromebook) => ({
      id: chromebook.id,
      assetTag: chromebook.assetTag,
      qr: await generateQrDataUrl(`${baseUrl}${chromebookQrPath(chromebook.id)}`),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
            &larr; {backLabel}
          </Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">
            Enganxa cada etiqueta a la part de sota del Chromebook corresponent. En escanejar-la,
            el professorat podrà reportar una incidència d&apos;aquest Chromebook en un sol toc.
          </p>
        </div>
        <PrintButton />
      </div>

      {guessed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm print:hidden">
          <p className="font-medium text-destructive">No imprimeixis encara</p>
          <p className="text-muted-foreground">
            Els QR apunten a <code>{baseUrl}</code> perquè no hi ha cap domini fixat. Un cop
            enganxats als Chromebooks no es poden canviar: configura <code>APP_URL</code> amb
            l&apos;adreça definitiva del centre abans d&apos;imprimir.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center print:break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generat en servidor, no cal optimització d'imatge */}
            <img src={label.qr} alt={`QR ${label.assetTag}`} className="size-28" />
            <span className="text-sm font-semibold">{label.assetTag}</span>
            <span className="text-xs text-muted-foreground">{caption}</span>
          </div>
        ))}
        {labels.length === 0 && (
          <p className="text-muted-foreground">No hi ha cap dispositiu per etiquetar.</p>
        )}
      </div>
    </div>
  );
}
