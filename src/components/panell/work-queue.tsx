import type { Route } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import type { BadgeVariant } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QueueItem = {
  id: string;
  href: Route;
  main: string;
  meta: string;
  badge: { label: string; variant: BadgeVariant } | null;
};

/**
 * Una llista de feina pendent: què és, de qui i quan, amb enllaç per resoldre-ho.
 * El panell en mostra només les primeres; `total` diu quantes n'hi ha de debò, i
 * `allHref` porta a la pàgina on surten totes.
 */
export function WorkQueue({
  title,
  icon: Icon,
  iconClassName,
  accentBorder,
  headerBg,
  countVariant = "secondary",
  items,
  total = items.length,
  allHref,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  accentBorder?: string;
  headerBg?: string;
  countVariant?: BadgeVariant;
  items: QueueItem[];
  total?: number;
  allHref?: Route;
  empty: string;
}) {
  const hidden = total - items.length;
  // Els salts amb hash són natius perquè el navegador actualitzi també :target.
  const AllLink = allHref?.includes("#") ? "a" : Link;

  return (
    <Card className={cn("h-full shadow-xs transition-shadow hover:shadow-sm", accentBorder)}>
      <CardHeader className={cn("border-b py-3.5", headerBg)}>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className={cn("size-4.5 shrink-0", iconClassName ?? "text-muted-foreground")} />
          <span className="truncate">{title}</span>
          {total > 0 && (
            <Badge variant={countVariant} className="ml-auto shrink-0 font-semibold">
              {total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => {
              const ItemLink = item.href.includes("#") ? "a" : Link;
              return (
                <li key={item.id}>
                  <ItemLink
                    href={item.href}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.main}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                    </span>
                    {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
                  </ItemLink>
                </li>
              );
            })}
          </ul>
        )}
        {hidden > 0 && allHref && (
          <AllLink href={allHref} className="mt-2 block text-sm font-medium hover:underline">
            {hidden === 1 ? "1 més" : `${hidden} més`} · Veure-les totes →
          </AllLink>
        )}
      </CardContent>
    </Card>
  );
}
