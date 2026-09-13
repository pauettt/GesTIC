import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { QrLabelSheet } from "@/components/chromebooks/qr-label-sheet";

export const metadata = { title: "Etiquetes QR del préstec a l'alumnat" };

/**
 * Etiquetes dels equips del pool de préstec. Són els que més les necessiten:
 * surten del centre i el formulari de nova incidència no els ofereix, així que
 * el QR és l'única manera ràpida de reportar-ne una avaria.
 *
 * L'etiqueta no porta el nom de cap alumne, i la pàgina a què porta tampoc:
 * l'aparell passa per moltes mans.
 */
export default async function StudentPoolLabelsPage() {
  await requireAdmin();

  const chromebooks = await db.chromebook.findMany({
    where: { isStudentLoanable: true, status: { not: "BAIXA" } },
    orderBy: { assetTag: "asc" },
    select: { id: true, assetTag: true },
  });

  return (
    <QrLabelSheet
      title="Etiquetes QR — préstec a l'alumnat"
      backHref="/chromebooks"
      backLabel="Torna a Chromebooks"
      caption="Préstec a l'alumnat"
      chromebooks={chromebooks}
    />
  );
}
