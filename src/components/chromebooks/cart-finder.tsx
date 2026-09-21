"use client";

import { useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { createReservation } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { SCHOOL_PERIODS } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FINDER_PARAMS = ["dia", "sessio", "equips"] as const;

const periodItems = SCHOOL_PERIODS.map((period) => ({
  value: String(period.id),
  label: `${period.label} (${period.start}–${period.end})`,
}));

/**
 * Dia, sessió i quants equips calen: els carros que ho compleixen surten a sota,
 * i es poden reservar d'allà mateix. Sense això calia entrar a cada carro a
 * mirar-ne l'horari. El filtre d'edifici, planta i aula de la pàgina es manté.
 */
export function CartFinder({
  initial,
  searching,
}: {
  initial: { dateKey: string; periodId: number; minDevices: number };
  searching: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dateKey, setDateKey] = useState(initial.dateKey);
  const [periodId, setPeriodId] = useState(String(initial.periodId));
  const [minDevices, setMinDevices] = useState(initial.minDevices > 0 ? String(initial.minDevices) : "");

  function navigate(values: { dia: string; sessio: string; equips: string } | null) {
    const params = new URLSearchParams(searchParams);
    for (const key of FINDER_PARAMS) params.delete(key);
    if (values) {
      params.set("dia", values.dia);
      params.set("sessio", values.sessio);
      if (values.equips) params.set("equips", values.equips);
    }
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ dia: dateKey, sessio: periodId, equips: minDevices });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Dia
        <Input
          type="date"
          value={dateKey}
          onChange={(event) => setDateKey(event.target.value)}
          required
          className="w-40"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Sessió
        <Select value={periodId} onValueChange={(next) => next && setPeriodId(next)} items={periodItems}>
          <SelectTrigger className="w-48" aria-label="Sessió">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Equips que calen
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={minDevices}
          onChange={(event) => setMinDevices(event.target.value)}
          placeholder="Qualsevol"
          className="w-32"
        />
      </label>
      <Button type="submit">
        <SearchIcon className="size-4" />
        Busca
      </Button>
      {searching && (
        <Button type="button" variant="ghost" onClick={() => navigate(null)}>
          <XIcon className="size-4" />
          Treu la cerca
        </Button>
      )}
    </form>
  );
}

/** Reserva el carro trobat per a la sessió cercada, amb el motiu opcional de sempre. */
export function QuickReserveButton({
  cartId,
  cartName,
  dateKey,
  periodId,
  when,
}: {
  cartId: string;
  cartName: string;
  dateKey: string;
  periodId: number;
  when: string;
}) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const { run, isPending } = useServerAction(createReservation, {
    successMessage: `Reserva confirmada: ${cartName}`,
    onSuccess: () => {
      setOpen(false);
      setPurpose("");
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" />}>Reserva</PopoverTrigger>
      <PopoverContent className="w-64">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ cartId, date: dateKey, periodIds: [periodId], purpose });
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">{cartName}</p>
          <p className="text-xs text-muted-foreground">{when}</p>
          <Input
            autoFocus
            placeholder="Motiu (opcional)"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Reservant…" : "Confirma la reserva"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
