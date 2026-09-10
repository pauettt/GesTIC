/**
 * Esquelet mentre es carrega una secció. Reprodueix l'estructura habitual
 * (títol + taula) perquè la pàgina no salti quan arriba el contingut real.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 rounded-md bg-muted/70" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-md bg-muted/70" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="h-10 border-b bg-muted/40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
            <div className="h-4 flex-1 rounded bg-muted/70" />
            <div className="h-4 w-28 rounded bg-muted/50" />
            <div className="h-5 w-20 rounded-full bg-muted/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Carregant…</span>
    </div>
  );
}
