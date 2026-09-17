import { requireUser } from "@/lib/permissions";
import { QueryForm } from "@/components/queries/query-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Nova petició o consulta" };

export default async function NovaConsultaPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Nova petició o consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryForm />
        </CardContent>
      </Card>
    </div>
  );
}
