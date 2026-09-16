import Image from "next/image";
import Link from "next/link";

import { generateQrDataUrl } from "@/lib/qr";
import { requireSuperAdmin } from "@/lib/permissions";
import { getBaseUrl, isBaseUrlGuessed } from "@/lib/url";
import { PrintButton } from "@/components/shared/print-button";

export const metadata = { title: "Cartell de gesTIC" };

/**
 * El cartell per a la sala de professors: un QR que porta a gesTIC i com
 * tenir-la a la pantalla d'inici del mòbil. El QR es genera aquí mateix, sense
 * cap servei extern, i no caduca: només deixaria de funcionar si canviés
 * l'adreça de l'aplicació.
 */
export default async function CartellPage() {
  await requireSuperAdmin();
  const baseUrl = await getBaseUrl();
  const guessed = isBaseUrlGuessed();
  // Gran, perquè imprès a mida d'A4 no quedi borrós.
  const qr = await generateQrDataUrl(baseUrl, 1024);
  const address = baseUrl.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-col gap-6">
      {/* Marges fixos: amb els de cada navegador, el cartell no omplia el full igual. */}
      <style>{"@page { size: A4 portrait; margin: 1.5cm; }"}</style>

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex max-w-2xl flex-col gap-1">
          <Link href="/administracio" className="text-sm text-muted-foreground hover:underline">
            &larr; Torna a l&apos;administració
          </Link>
          <h1 className="text-2xl font-semibold">Cartell per a la sala de professors</h1>
          <p className="text-muted-foreground">
            Imprimeix-lo en un A4 i penja&apos;l on el vegi el claustre. En escanejar-lo s&apos;entra a
            gesTIC amb el compte del centre; l&apos;alumnat no hi pot entrar.
          </p>
        </div>
        <PrintButton />
      </div>

      {guessed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm print:hidden">
          <p className="font-medium text-destructive">No imprimeixis encara</p>
          <p className="text-muted-foreground">
            El QR apunta a <code>{baseUrl}</code> perquè no hi ha cap domini fixat. Un cop penjat no es pot
            canviar: configura <code>APP_URL</code> amb l&apos;adreça definitiva abans d&apos;imprimir.
          </p>
        </div>
      )}

      {/*
        Sempre en blanc i negre, també en mode fosc: és una vista prèvia del paper.
        En imprimir, tot més gran perquè es llegeixi de lluny i ompli l'A4.
      */}
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 rounded-xl border-2 bg-white p-8 text-center text-black sm:p-10 print:max-w-none print:gap-[0.9cm] print:border-0 print:p-0">
        <div className="flex items-center gap-4 print:gap-6">
          <Image
            src="/icon-512.png"
            alt=""
            width={72}
            height={72}
            loading="eager"
            className="print:size-[2.4cm]"
          />
          <div className="text-left">
            <p className="text-4xl font-semibold print:text-6xl">gesTIC</p>
            <p className="text-lg text-neutral-600 print:mt-2 print:text-2xl">Coordinació TIC del centre</p>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generat en servidor, no cal optimització d'imatge */}
        <img
          src={qr}
          alt="QR de gesTIC"
          className="size-64 [image-rendering:pixelated] sm:size-80 print:size-[11cm]"
        />

        <div>
          <p className="text-2xl font-semibold text-balance print:text-4xl">
            Escaneja&apos;m i entra amb el compte del centre
          </p>
          <p className="mt-1 text-lg text-neutral-600 print:mt-2 print:text-2xl">{address}</p>
        </div>

        <p className="text-lg print:text-2xl">Incidències · Carros · Cites · Consultes · Dubtes i tutorials</p>

        <div className="grid w-full gap-4 border-t border-neutral-300 pt-6 text-left sm:grid-cols-2 print:grid-cols-2 print:gap-x-8 print:pt-[0.8cm] print:text-base">
          <p className="text-center text-lg font-semibold sm:col-span-2 print:col-span-2 print:text-2xl">
            Tingues-la a mà a la pantalla d&apos;inici
          </p>
          <div>
            <p className="font-medium">Android</p>
            <p className="text-neutral-600">
              Menú ⋮ de Chrome → «Instal·la l&apos;aplicació» o «Afegeix a la pantalla d&apos;inici»
            </p>
          </div>
          <div>
            <p className="font-medium">iPhone</p>
            <p className="text-neutral-600">
              Botó de compartir de Safari → «Afegeix a la pantalla d&apos;inici»
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
