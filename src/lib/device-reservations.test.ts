import { describe, expect, it } from "vitest";

import { zonedDateTime } from "@/lib/date";
import {
  bookingSpanLabel,
  canBeReserved,
  holderReason,
  isFreeDuring,
  isFreeNow,
  isHeld,
  occupies,
  sessionSpan,
  withHolder,
} from "@/lib/device-reservations";

const at = (time: string, day = "2026-09-22") => zonedDateTime(day, time);

// Dimarts de 3a a 4a hora: de 9:50 a 12:10, amb el pati pel mig.
const booking = { startDate: at("09:50"), endDate: at("12:10") };

describe("sessionSpan", () => {
  it("va de l'inici de la primera sessió al final de l'última", () => {
    const span = sessionSpan("2026-09-22", 3, 4);
    expect(span?.startDate).toEqual(at("09:50"));
    expect(span?.endDate).toEqual(at("12:10"));
  });

  it("no accepta una sessió final anterior a la inicial ni sessions que no existeixen", () => {
    expect(sessionSpan("2026-09-22", 4, 3)).toBeNull();
    expect(sessionSpan("2026-09-22", 3, 99)).toBeNull();
  });

  it("es diu com s'ha triat", () => {
    expect(bookingSpanLabel(booking)).toBe("3a a 4a hora (09:50–12:10)");
    expect(bookingSpanLabel({ startDate: at("09:50"), endDate: at("10:45") })).toBe("3a hora (09:50–10:45)");
  });
});

describe("occupies", () => {
  const morning = at("08:00");

  it("ocupa les sessions que se solapen amb la reserva, i no les altres", () => {
    expect(occupies(booking, at("11:15"), at("12:10"), morning)).toBe(true);
    expect(occupies(booking, at("08:55"), at("09:50"), morning)).toBe(false);
    expect(occupies(booking, at("12:10"), at("13:05"), morning)).toBe(false);
  });

  it("si no l'ha tornat a l'hora, l'ocupa fins que el torni", () => {
    const afternoon = at("13:30");
    expect(occupies(booking, at("14:00"), at("14:55"), afternoon)).toBe(true);
    expect(occupies(booking, at("08:00", "2026-09-23"), at("08:55", "2026-09-23"), afternoon)).toBe(true);
  });

  it("un equip reservat per a més tard encara és al carro", () => {
    expect(isHeld(booking, morning)).toBe(false);
    expect(isHeld(booking, at("10:00"))).toBe(true);
  });
});

describe("withHolder", () => {
  const device = { status: "DISPONIBLE" as const, unavailableReason: null };
  const holder = { who: "Anna Puig", endDate: at("12:10") };

  it("mentre el té algú, surt com a no disponible amb el seu nom", () => {
    expect(withHolder(device, holder, at("10:00"))).toEqual({
      status: "NO_DISPONIBLE",
      unavailableReason: "Reserva · Anna Puig, fins a les 12:10",
    });
  });

  it("si ja l'havia de tornar, ho diu, i si és d'un altre dia, quin", () => {
    expect(holderReason(holder, at("13:00"))).toBe("Reserva · Anna Puig, que l'havia de tornar a les 12:10");
    expect(holderReason(holder, at("09:00", "2026-09-23"))).toBe(
      "Reserva · Anna Puig, que l'havia de tornar dimarts 22 de setembre a les 12:10",
    );
  });

  it("sense ningú que el tingui, o si ja no funcionava, no canvia res", () => {
    expect(withHolder(device, null)).toBe(device);
    const broken = { status: "EN_INCIDENCIA" as const, unavailableReason: null };
    expect(withHolder(broken, holder)).toBe(broken);
  });
});

describe("disponibilitat d'un equip del carro", () => {
  const device = { status: "DISPONIBLE" as const, reservations: [booking] };

  it("no hi és mentre el té algú, ni a les sessions que té reservades", () => {
    expect(isFreeNow(device, at("08:30"))).toBe(true);
    expect(isFreeNow(device, at("10:00"))).toBe(false);
    expect(isFreeDuring(device, at("11:15"), at("12:10"), at("08:30"))).toBe(false);
    expect(isFreeDuring(device, at("13:05"), at("14:00"), at("08:30"))).toBe(true);
  });

  it("un equip que no funciona no hi és mai, encara que ningú no el tingui", () => {
    const broken = { status: "EN_INCIDENCIA" as const, reservations: [] };
    expect(isFreeNow(broken)).toBe(false);
    expect(canBeReserved(broken.status, [])).toBe(false);
  });

  it("mentre algú no el torna, no es pot reservar per a cap altra hora", () => {
    expect(canBeReserved("DISPONIBLE", [{ overdue: false }])).toBe(true);
    expect(canBeReserved("DISPONIBLE", [{ overdue: true }])).toBe(false);
  });
});
