import type { CourseStats } from "@/lib/panell-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatAverage(days: number | null) {
  if (days === null) return "—";
  return days < 1 ? "menys d'un dia" : `${days.toFixed(1)} dies`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
      </CardHeader>
    </Card>
  );
}

export function CourseMetrics({ stats }: { stats: CourseStats }) {
  const maxMonth = Math.max(1, ...stats.byMonth.map(([, count]) => count));

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Aquest curs</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Stat label="Incidències reportades" value={stats.reportedCount} />
        <Stat label="Resoltes" value={stats.resolvedCount} />
        <Stat label="Temps mitjà de resolució" value={formatAverage(stats.avgResolutionDays)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Incidències per mes</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {stats.byMonth.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Encara no hi ha dades del curs.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.byMonth.map(([month, count]) => (
                  <li key={month} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 text-muted-foreground">{month}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${(count / maxMonth) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">On es concentren</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {stats.topSpaces.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Encara no hi ha dades del curs.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.topSpaces.map(([space, count]) => (
                  <li key={space} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{space}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
