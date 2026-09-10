"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Cerca per marca, model, número de sèrie o aula. Espera 300 ms des de l'última
 * tecla abans de navegar: si no, cada lletra dispararia una consulta.
 */
export function InventorySearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (value === current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("q", value);
      else params.delete("q");
      router.replace(`${pathname}?${params}` as Route);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, searchParams, pathname, router]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Neteja la cerca"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
