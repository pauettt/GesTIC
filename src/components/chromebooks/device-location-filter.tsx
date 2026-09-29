"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { STUDENT_POOL_FILTER } from "@/lib/device-inventory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * A l'inventari de dispositius, de quin carro (o del préstec a l'alumnat). Va a
 * la URL, com la cerca, que es manté en canviar-lo.
 */
export function DeviceLocationFilter({
  carts,
  studentPool,
  value,
}: {
  carts: { id: string; name: string }[];
  /** Si hi ha equips de préstec a l'alumnat per oferir-los com a opció. */
  studentPool: boolean;
  value: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const items = [
    { value: null, label: "Tots els carros" },
    ...carts.map((cart) => ({ value: cart.id, label: cart.name })),
    ...(studentPool ? [{ value: STUDENT_POOL_FILTER, label: "Préstec a l'alumnat" }] : []),
  ];

  function navigate(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("on", next);
    else params.delete("on");
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
  }

  return (
    <Select value={value} onValueChange={(next) => navigate(next ?? null)} items={items}>
      <SelectTrigger className="w-full data-[size=default]:h-10 sm:w-56" aria-label="On és">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
