import { requireUser } from "@/lib/permissions";
import { QueryForm } from "@/components/queries/query-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Nova consulta" };

export default async function NovaConsultaPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Fes una pregunta</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryForm />
        </CardContent>
      </Card>
    </div>
  );
}
