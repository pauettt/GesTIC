import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("No autoritzat");
        }
        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024,
        };
      },
      // Sense `onUploadCompleted`: no hi ha res a fer quan acaba la pujada (la URL
      // es desa quan s'envia el formulari), i declarar-lo buit feia que en local
      // Vercel busqués una adreça de retorn i deixés un avís a cada pujada.
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    // El client de @vercel/blob descarta el cos de la resposta i llança sempre
    // "Failed to retrieve the client token", així que la causa real (token del
    // blob store absent, sessió caducada…) només es veu si la registrem aquí.
    console.error("[blob/upload] no s'ha pogut generar el token de client:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error pujant el fitxer" },
      { status: 400 },
    );
  }
}
