import { addDays, madridDateKey, zonedDateTime } from "@/lib/date";
import { isDateKey } from "@/lib/validations/common";
import { getPeriodById, isPastPeriod, isSchoolDay, SCHOOL_PERIODS, type SchoolPeriod } from "@/lib/schedule";

/**
 * El cercador de carros lliures de /chromebooks: quin dia, quina sessió i quants
 * equips calen com a mínim. Va a la URL (`?dia=…&sessio=…&equips=…`) perquè en
 * reservar-ne un la pàgina es refresqui amb la mateixa cerca.
 */
export type CartSearch = {
  dateKey: string;
  period: SchoolPeriod;
  minDevices: number;
  startDate: Date;
  endDate: Date;
};

type Param = string | string[] | undefined;

export type CartSearchResult =
  | { status: "none" }
  | { status: "invalid"; message: string }
  | { status: "ok"; search: CartSearch };

export function parseCartSearch(
  params: { dia?: Param; sessio?: Param; equips?: Param },
  now: Date = new Date(),
): CartSearchResult {
  const { dia, sessio, equips } = params;
  if (dia === undefined && sessio === undefined) return { status: "none" };
  if (typeof dia !== "string" || !isDateKey(dia)) {
    return { status: "invalid", message: "Tria un dia." };
  }
  if (!isSchoolDay(dia)) {
    return { status: "invalid", message: "Els carros només es reserven de dilluns a divendres." };
  }
  const period = typeof sessio === "string" ? getPeriodById(Number(sessio)) : undefined;
  if (!period) return { status: "invalid", message: "Tria una sessió." };

  const startDate = zonedDateTime(dia, period.start);
  const endDate = zonedDateTime(dia, period.end);
  if (isPastPeriod(endDate, now)) {
    return { status: "invalid", message: "Aquesta sessió ja ha passat." };
  }

  const wanted = typeof equips === "string" ? Number.parseInt(equips, 10) : 0;
  const minDevices = Number.isFinite(wanted) && wanted > 0 ? wanted : 0;
  return { status: "ok", search: { dateKey: dia, period, minDevices, startDate, endDate } };
}

/**
 * El dia i la sessió que proposa el formulari: la sessió que encara no ha
 * acabat, avui mateix; si avui ja no en queda cap o és cap de setmana, la
 * primera del proper dia lectiu.
 */
export function defaultCartSearch(now: Date = new Date()): { dateKey: string; periodId: number } {
  let dateKey = madridDateKey(now);
  for (let tries = 0; tries < 7; tries++) {
    if (isSchoolDay(dateKey)) {
      const next = SCHOOL_PERIODS.find(
        (period) => !isPastPeriod(zonedDateTime(dateKey, period.end), now),
      );
      if (next) return { dateKey, periodId: next.id };
    }
    dateKey = madridDateKey(addDays(zonedDateTime(dateKey, "00:00"), 1));
  }
  return { dateKey, periodId: SCHOOL_PERIODS[0].id };
}
